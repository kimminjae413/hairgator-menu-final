from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import time
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

app = Flask(__name__)
CORS(app, origins=["*"])  # HAIRGATOR 프론트엔드에서 접근 허용

# AKOOL API 설정
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
BASE_URL = "https://openapi.akool.com/api/open/v3"

# 글로벌 토큰 저장
token_cache = {
    'token': None,
    'expires_at': 0
}

def get_akool_token():
    """AKOOL API 토큰 발급/갱신"""
    current_time = time.time()
    
    # 토큰이 유효하면 재사용
    if token_cache['token'] and current_time < token_cache['expires_at']:
        return token_cache['token']
    
    # 새 토큰 발급
    try:
        response = requests.post(f"{BASE_URL}/getToken", json={
            "clientId": CLIENT_ID,
            "clientSecret": CLIENT_SECRET
        })
        
        data = response.json()
        
        if data.get('code') == 1000:
            token_cache['token'] = data['token']
            # 토큰 유효기간을 11개월로 설정 (안전하게 조금 짧게)
            token_cache['expires_at'] = current_time + (10 * 30 * 24 * 60 * 60)
            return token_cache['token']
        else:
            raise Exception(f"토큰 발급 실패: {data.get('msg', '알 수 없는 오류')}")
            
    except Exception as e:
        print(f"토큰 발급 오류: {e}")
        raise

def detect_face(image_url, single_face=True):
    """얼굴 탐지"""
    token = get_akool_token()
    
    response = requests.post("https://sg3.akool.com/detect", 
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={
            'single_face': single_face,
            'image_url': image_url
        }
    )
    
    data = response.json()
    
    if data.get('error_code') == 0:
        return {
            'success': True,
            'landmarks': json.loads(data['landmarks_str'][0]),  # JSON 파싱
            'region': data['region'][0]
        }
    else:
        return {
            'success': False,
            'error': data.get('error_msg', '얼굴 탐지 실패')
        }

@app.route('/api/face-swap', methods=['POST'])
def face_swap():
    """Face Swap API 엔드포인트"""
    try:
        data = request.get_json()
        customer_image_url = data.get('customerImageUrl')
        style_image_url = data.get('styleImageUrl')
        
        if not customer_image_url or not style_image_url:
            return jsonify({
                'success': False,
                'error': '이미지 URL이 필요합니다'
            }), 400
        
        # 1. 고객 이미지 얼굴 탐지
        customer_face = detect_face(customer_image_url)
        if not customer_face['success']:
            return jsonify({
                'success': False,
                'error': f'고객 사진 얼굴 탐지 실패: {customer_face["error"]}'
            }), 400
        
        # 2. 스타일 이미지 얼굴 탐지
        style_face = detect_face(style_image_url)
        if not style_face['success']:
            return jsonify({
                'success': False,
                'error': f'스타일 이미지 얼굴 탐지 실패: {style_face["error"]}'
            }), 400
        
        # 3. Face Swap 실행
        token = get_akool_token()
        
        swap_response = requests.post(f"{BASE_URL}/faceswap/highquality/specifyimage",
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json={
                'sourceImage': [{
                    'path': customer_image_url,
                    'opts': customer_face['landmarks']
                }],
                'targetImage': [{
                    'path': style_image_url,
                    'opts': style_face['landmarks']
                }],
                'face_enhance': 1,
                'modifyImage': style_image_url,
                'webhookUrl': ""
            }
        )
        
        swap_data = swap_response.json()
        
        if swap_data.get('code') == 1000:
            # 4. 결과 폴링
            result_id = swap_data['data']['_id']
            job_id = swap_data['data']['job_id']
            
            # 결과 대기 (최대 3분)
            for attempt in range(30):
                time.sleep(6)  # 6초 대기
                
                result_response = requests.get(
                    f"{BASE_URL}/faceswap/result/listbyids?_ids={result_id}",
                    headers={'Authorization': f'Bearer {token}'}
                )
                
                result_data = result_response.json()
                
                if (result_data.get('code') == 1000 and 
                    result_data['data']['result'] and 
                    len(result_data['data']['result']) > 0):
                    
                    result = result_data['data']['result'][0]
                    
                    if result['faceswap_status'] == 3:  # 완료
                        return jsonify({
                            'success': True,
                            'imageUrl': result['url'],
                            'jobId': job_id
                        })
                    elif result['faceswap_status'] == 4:  # 실패
                        return jsonify({
                            'success': False,
                            'error': 'AI 처리 중 오류가 발생했습니다'
                        })
            
            # 타임아웃
            return jsonify({
                'success': False,
                'error': '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Face Swap 요청 실패: {swap_data.get("msg", "알 수 없는 오류")}'
            })
    
    except Exception as e:
        print(f"Face Swap 오류: {e}")
        return jsonify({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({'status': 'ok', 'message': 'Face Swap 서버가 정상 동작 중입니다'})

@app.route('/api/webhook', methods=['POST'])
def webhook():
    """AKOOL 웹훅 엔드포인트 (향후 확장용)"""
    try:
        data = request.get_json()
        print(f"Webhook 수신: {data}")
        return jsonify({'status': 'received'})
    except Exception as e:
        print(f"Webhook 오류: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if not CLIENT_ID or not CLIENT_SECRET:
        print("오류: CLIENT_ID와 CLIENT_SECRET을 .env 파일에 설정해주세요")
        exit(1)
    
    print("HAIRGATOR Face Swap 서버 시작...")
    print(f"서버 주소: http://localhost:3008")
    app.run(debug=True, port=3008)
