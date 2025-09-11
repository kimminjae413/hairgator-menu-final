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
# HAIRGATOR에서 접근 허용 (Netlify + 로컬)
CORS(app, origins=["*"], 
     allow_headers=["Content-Type", "Authorization", "Accept"],
     methods=["GET", "POST", "OPTIONS"])

# AKOOL API 설정
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
BASE_URL = "https://openapi.akool.com/api/open/v3"
DETECT_URL = "https://sg3.akool.com/detect"

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
        print(f"기존 토큰 재사용: {token_cache['token'][:20]}...")
        return token_cache['token']
    
    # 새 토큰 발급
    try:
        print("새 AKOOL 토큰 발급 중...")
        response = requests.post(f"{BASE_URL}/getToken", json={
            "clientId": CLIENT_ID,
            "clientSecret": CLIENT_SECRET
        })
        
        data = response.json()
        print(f"토큰 발급 응답: {data}")
        
        if data.get('code') == 1000:
            token_cache['token'] = data['token']
            # 토큰 유효기간을 11개월로 설정 (안전하게 조금 짧게)
            token_cache['expires_at'] = current_time + (10 * 30 * 24 * 60 * 60)
            print(f"✅ 새 토큰 발급 성공: {token_cache['token'][:20]}...")
            return token_cache['token']
        else:
            raise Exception(f"토큰 발급 실패: {data.get('msg', '알 수 없는 오류')}")
            
    except Exception as e:
        print(f"❌ 토큰 발급 오류: {e}")
        raise

def detect_face(image_url, single_face=True):
    """얼굴 탐지 - 수정된 버전"""
    try:
        token = get_akool_token()
        print(f"얼굴 탐지 시작: {image_url}")
        
        response = requests.post(DETECT_URL, 
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
        print(f"얼굴 탐지 응답: {data}")
        
        if data.get('error_code') == 0:
            # landmarks_str을 직접 사용 (이미 문자열 형태)
            landmarks_str = data['landmarks_str'][0] if data['landmarks_str'] else ""
            
            return {
                'success': True,
                'landmarks': landmarks_str,  # 문자열 그대로 사용
                'region': data['region'][0] if data['region'] else []
            }
        else:
            return {
                'success': False,
                'error': data.get('error_msg', '얼굴 탐지 실패')
            }
            
    except Exception as e:
        print(f"얼굴 탐지 예외: {e}")
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인 - HAIRGATOR 프론트엔드가 호출"""
    try:
        # AKOOL 토큰 테스트
        token = get_akool_token()
        
        return jsonify({
            'status': 'ok', 
            'message': 'HAIRGATOR Face Swap 서버 정상 동작',
            'akool_connected': True,
            'timestamp': time.time()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'AKOOL 연결 실패: {str(e)}',
            'akool_connected': False,
            'timestamp': time.time()
        }), 500

@app.route('/api/face-swap', methods=['POST'])
def face_swap():
    """Face Swap API - HAIRGATOR 프론트엔드용"""
    try:
        data = request.get_json()
        print(f"📥 Face Swap 요청: {data}")
        
        # HAIRGATOR에서 보내는 데이터 구조에 맞게 수정
        customer_image_url = data.get('customer_image_url') or data.get('customerImageUrl')
        style_image_url = data.get('style_image_url') or data.get('styleImageUrl')
        
        if not customer_image_url or not style_image_url:
            return jsonify({
                'success': False,
                'error': '고객 사진과 스타일 이미지 URL이 필요합니다'
            }), 400
        
        print(f"🖼️ 고객 이미지: {customer_image_url[:50]}...")
        print(f"🎨 스타일 이미지: {style_image_url[:50]}...")
        
        # 1. 고객 이미지 얼굴 탐지
        print("👤 고객 이미지 얼굴 탐지 중...")
        customer_face = detect_face(customer_image_url, single_face=True)
        if not customer_face['success']:
            return jsonify({
                'success': False,
                'error': f'고객 사진에서 얼굴을 찾을 수 없습니다: {customer_face["error"]}'
            }), 400
        
        # 2. 스타일 이미지 얼굴 탐지
        print("💇 스타일 이미지 얼굴 탐지 중...")
        style_face = detect_face(style_image_url, single_face=True)
        if not style_face['success']:
            return jsonify({
                'success': False,
                'error': f'스타일 이미지에서 얼굴을 찾을 수 없습니다: {style_face["error"]}'
            }), 400
        
        # 3. Face Swap 실행
        print("🔄 AKOOL Face Swap 처리 시작...")
        token = get_akool_token()
        
        swap_payload = {
            'sourceImage': [{  # 고객 얼굴 (바꿀 얼굴)
                'path': customer_image_url,
                'opts': customer_face['landmarks']
            }],
            'targetImage': [{  # 스타일 이미지의 얼굴 (기준이 되는 얼굴)
                'path': style_image_url,
                'opts': style_face['landmarks']
            }],
            'face_enhance': 1,  # 얼굴 향상 활성화
            'modifyImage': style_image_url,  # 수정할 기본 이미지
            'webhookUrl': ""  # 웹훅 URL (선택사항)
        }
        
        print(f"📤 AKOOL API 요청: {swap_payload}")
        
        swap_response = requests.post(f"{BASE_URL}/faceswap/highquality/specifyimage",
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json=swap_payload
        )
        
        swap_data = swap_response.json()
        print(f"📥 AKOOL API 응답: {swap_data}")
        
        if swap_data.get('code') == 1000:
            # 4. 결과 폴링 (최대 3분 대기)
            result_id = swap_data['data']['_id']
            job_id = swap_data['data']['job_id']
            
            print(f"⏳ 결과 대기 중... (ID: {result_id})")
            
            # 결과 대기 (30번 시도, 6초씩 = 3분)
            for attempt in range(30):
                print(f"🔍 결과 확인 시도 {attempt + 1}/30...")
                time.sleep(6)  # 6초 대기
                
                result_response = requests.get(
                    f"{BASE_URL}/faceswap/result/listbyids?_ids={result_id}",
                    headers={'Authorization': f'Bearer {token}'}
                )
                
                result_data = result_response.json()
                print(f"📊 결과 상태: {result_data}")
                
                if (result_data.get('code') == 1000 and 
                    result_data['data']['result'] and 
                    len(result_data['data']['result']) > 0):
                    
                    result = result_data['data']['result'][0]
                    status = result['faceswap_status']
                    
                    if status == 1:
                        print("⏳ 대기열에서 처리 중...")
                    elif status == 2:
                        print("🎨 AI가 열심히 작업 중...")
                    elif status == 3:  # 완료
                        print("✅ AI 합성 완료!")
                        return jsonify({
                            'success': True,
                            'result_image_url': result['url'],
                            'imageUrl': result['url'],  # HAIRGATOR 호환성
                            'job_id': job_id,
                            'processing_time': attempt * 6
                        })
                    elif status == 4:  # 실패
                        print("❌ AI 처리 실패")
                        return jsonify({
                            'success': False,
                            'error': 'AI 처리 중 오류가 발생했습니다'
                        })
            
            # 타임아웃
            print("⏰ 처리 시간 초과")
            return jsonify({
                'success': False,
                'error': '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
            })
        else:
            error_msg = swap_data.get('msg', '알 수 없는 오류')
            print(f"❌ Face Swap 요청 실패: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'Face Swap 요청 실패: {error_msg}'
            })
    
    except Exception as e:
        print(f"💥 Face Swap 예외: {e}")
        return jsonify({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/status/<job_id>', methods=['GET'])
def check_job_status(job_id):
    """작업 상태 확인"""
    try:
        # 실제 구현에서는 job_id로 AKOOL 결과 확인
        return jsonify({
            'success': True,
            'status': 'completed',
            'progress': 100
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/webhook', methods=['POST'])
def webhook():
    """AKOOL 웹훅 엔드포인트"""
    try:
        data = request.get_json()
        print(f"📨 Webhook 수신: {data}")
        return jsonify({'status': 'received'})
    except Exception as e:
        print(f"Webhook 오류: {e}")
        return jsonify({'error': str(e)}), 500

# CORS Preflight 처리
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

if __name__ == '__main__':
    if not CLIENT_ID or not CLIENT_SECRET:
        print("❌ 오류: CLIENT_ID와 CLIENT_SECRET을 .env 파일에 설정해주세요")
        print("예시:")
        print("CLIENT_ID=your_akool_client_id")
        print("CLIENT_SECRET=your_akool_client_secret")
        exit(1)
    
    print("🚀 HAIRGATOR Face Swap 서버 시작...")
    print(f"📡 서버 주소: http://localhost:3008")
    print(f"🔑 AKOOL Client ID: {CLIENT_ID[:10]}...")
    print("✅ CORS 설정: 모든 도메인 허용")
    
    app.run(debug=True, port=3008, host='0.0.0.0')
