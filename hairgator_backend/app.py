from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import time
import os
from datetime import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, storage
import base64
import uuid

# .env 파일 로드
load_dotenv()

app = Flask(__name__)
# HAIRGATOR에서 접근 허용
CORS(app, origins=["*"], 
     allow_headers=["Content-Type", "Authorization", "Accept"],
     methods=["GET", "POST", "OPTIONS"])

# Firebase Admin SDK 초기화
try:
    # 서비스 계정 키 파일 경로
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'hairgatormenu-4a43e.firebasestorage.app'
    })
    db = firestore.client()
    bucket = storage.bucket()
    print("✅ Firebase Admin SDK 초기화 성공")
except Exception as e:
    print(f"⚠️ Firebase 초기화 실패 (선택사항): {e}")
    db = None
    bucket = None

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
            # 토큰 유효기간을 11개월로 설정
            token_cache['expires_at'] = current_time + (10 * 30 * 24 * 60 * 60)
            print(f"✅ 새 토큰 발급 성공: {token_cache['token'][:20]}...")
            return token_cache['token']
        else:
            raise Exception(f"토큰 발급 실패: {data.get('msg', '알 수 없는 오류')}")
            
    except Exception as e:
        print(f"❌ 토큰 발급 오류: {e}")
        raise

def detect_face(image_url, single_face=True):
    """얼굴 탐지"""
    try:
        token = get_akool_token()
        print(f"얼굴 탐지 시작: {image_url[:50]}...")
        
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
        
        if data.get('error_code') == 0:
            landmarks_str = data['landmarks_str'][0] if data['landmarks_str'] else ""
            
            return {
                'success': True,
                'landmarks': landmarks_str,
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

def upload_base64_to_storage(base64_data, folder="ai_uploads"):
    """Base64 이미지를 Firebase Storage에 업로드"""
    if not bucket:
        return None
        
    try:
        # Base64 디코딩
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        image_data = base64.b64decode(base64_data)
        
        # 고유 파일명 생성
        filename = f"{folder}/{uuid.uuid4()}.jpg"
        blob = bucket.blob(filename)
        
        # 업로드
        blob.upload_from_string(image_data, content_type='image/jpeg')
        
        # 공개 URL 생성
        blob.make_public()
        return blob.public_url
        
    except Exception as e:
        print(f"Storage 업로드 실패: {e}")
        return None

def save_ai_result_to_firestore(data, result_url, processing_time):
    """AI 결과를 Firestore에 저장"""
    if not db:
        return None
        
    try:
        ai_result = {
            'userId': data.get('userId', 'anonymous'),
            'userName': data.get('userName', ''),
            'styleId': data.get('styleId', ''),
            'styleName': data.get('styleName', ''),
            'styleImage': data.get('style_image_url', ''),
            'customerImage': data.get('customer_image_url', ''),
            'resultImage': result_url,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'processingTime': processing_time,
            'status': 'completed'
        }
        
        # ai_results 컬렉션에 저장
        doc_ref = db.collection('ai_results').add(ai_result)
        
        # 스타일 사용 통계 업데이트
        if data.get('styleId'):
            style_ref = db.collection('hairstyles').document(data['styleId'])
            style_ref.update({
                'ai_usage_count': firestore.Increment(1),
                'last_ai_used': firestore.SERVER_TIMESTAMP
            })
        
        # 전체 통계 업데이트
        stats_ref = db.collection('statistics').document('ai_usage')
        stats_ref.set({
            'total_swaps': firestore.Increment(1),
            'last_used': firestore.SERVER_TIMESTAMP,
            f'daily_{datetime.now().strftime("%Y%m%d")}': firestore.Increment(1)
        }, merge=True)
        
        print(f"✅ Firestore 저장 완료: {doc_ref[1].id}")
        return doc_ref[1].id
        
    except Exception as e:
        print(f"Firestore 저장 실패: {e}")
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    try:
        token = get_akool_token()
        
        return jsonify({
            'status': 'ok', 
            'message': 'HAIRGATOR Face Swap 서버 정상 동작',
            'akool_connected': True,
            'firebase_connected': db is not None,
            'timestamp': time.time()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'AKOOL 연결 실패: {str(e)}',
            'akool_connected': False,
            'firebase_connected': db is not None,
            'timestamp': time.time()
        }), 500

@app.route('/api/face-swap', methods=['POST'])
def face_swap():
    """Face Swap API - 최종 버전"""
    start_time = time.time()
    
    try:
        data = request.get_json()
        print(f"📥 Face Swap 요청 받음")
        
        # 데이터 추출
        customer_image_url = data.get('customer_image_url') or data.get('customerImageUrl')
        style_image_url = data.get('style_image_url') or data.get('styleImageUrl')
        
        if not customer_image_url or not style_image_url:
            return jsonify({
                'success': False,
                'error': '고객 사진과 스타일 이미지 URL이 필요합니다'
            }), 400
        
        # Base64 이미지를 Storage URL로 변환 (선택사항)
        if customer_image_url.startswith('data:image/') and bucket:
            print("📤 고객 이미지 Firebase Storage 업로드 중...")
            uploaded_url = upload_base64_to_storage(customer_image_url, "customer_photos")
            if uploaded_url:
                customer_image_url = uploaded_url
                print(f"✅ Storage URL: {uploaded_url[:50]}...")
        
        # 1. 고객 이미지 얼굴 탐지
        print("👤 고객 얼굴 분석 중...")
        customer_face = detect_face(customer_image_url, single_face=True)
        if not customer_face['success']:
            return jsonify({
                'success': False,
                'error': f'고객 사진에서 얼굴을 찾을 수 없습니다'
            }), 400
        
        # 2. 스타일 이미지 얼굴 탐지
        print("💇 스타일 얼굴 분석 중...")
        style_face = detect_face(style_image_url, single_face=True)
        if not style_face['success']:
            return jsonify({
                'success': False,
                'error': f'스타일 이미지에서 얼굴을 찾을 수 없습니다'
            }), 400
        
        # 3. AKOOL Face Swap 실행
        print("🔄 AI Face Swap 처리 시작...")
        token = get_akool_token()
        
        swap_payload = {
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
        
        swap_response = requests.post(f"{BASE_URL}/faceswap/highquality/specifyimage",
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json=swap_payload
        )
        
        swap_data = swap_response.json()
        
        if swap_data.get('code') == 1000:
            result_id = swap_data['data']['_id']
            job_id = swap_data['data']['job_id']
            
            print(f"⏳ AI 처리 중... (Job ID: {job_id})")
            
            # 4. 결과 폴링 (최대 3분)
            for attempt in range(30):
                time.sleep(6)
                
                result_response = requests.get(
                    f"{BASE_URL}/faceswap/result/listbyids?_ids={result_id}",
                    headers={'Authorization': f'Bearer {token}'}
                )
                
                result_data = result_response.json()
                
                if (result_data.get('code') == 1000 and 
                    result_data['data']['result'] and 
                    len(result_data['data']['result']) > 0):
                    
                    result = result_data['data']['result'][0]
                    status = result.get('faceswap_status')
                    
                    if status == 1:
                        print(f"⏳ [{attempt+1}/30] 대기열...")
                    elif status == 2:
                        print(f"🎨 [{attempt+1}/30] AI 처리 중...")
                    elif status == 3:  # 완료
                        result_url = result['url']
                        processing_time = round(time.time() - start_time, 2)
                        
                        print(f"✅ AI 합성 완료! (처리시간: {processing_time}초)")
                        
                        # Firestore에 저장 (선택사항)
                        doc_id = None
                        if db:
                            doc_id = save_ai_result_to_firestore(data, result_url, processing_time)
                        
                        return jsonify({
                            'success': True,
                            'result_image_url': result_url,
                            'imageUrl': result_url,  # 호환성
                            'job_id': job_id,
                            'doc_id': doc_id,
                            'processing_time': processing_time
                        })
                    elif status == 4:  # 실패
                        print("❌ AI 처리 실패")
                        
                        # 에러 로깅
                        if db:
                            db.collection('error_logs').add({
                                'type': 'face_swap_failed',
                                'job_id': job_id,
                                'timestamp': firestore.SERVER_TIMESTAMP
                            })
                        
                        return jsonify({
                            'success': False,
                            'error': 'AI 처리 중 오류가 발생했습니다'
                        })
            
            # 타임아웃
            print("⏰ 처리 시간 초과")
            return jsonify({
                'success': False,
                'error': '처리 시간이 초과되었습니다 (3분). 다시 시도해주세요.'
            })
        else:
            error_msg = swap_data.get('msg', '알 수 없는 오류')
            print(f"❌ Face Swap 실패: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'Face Swap 실패: {error_msg}'
            })
    
    except Exception as e:
        print(f"💥 서버 오류: {e}")
        
        # 에러 로깅
        if db:
            db.collection('error_logs').add({
                'type': 'server_error',
                'error': str(e),
                'timestamp': firestore.SERVER_TIMESTAMP
            })
        
        return jsonify({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/history/<user_id>', methods=['GET'])
def get_user_history(user_id):
    """사용자 AI 체험 기록 조회"""
    if not db:
        return jsonify({'error': 'Firebase not connected'}), 503
        
    try:
        results = db.collection('ai_results')\
            .where('userId', '==', user_id)\
            .order_by('createdAt', direction=firestore.Query.DESCENDING)\
            .limit(20)\
            .get()
        
        history = []
        for doc in results:
            data = doc.to_dict()
            data['id'] = doc.id
            if data.get('createdAt'):
                data['createdAt'] = data['createdAt'].isoformat() if hasattr(data['createdAt'], 'isoformat') else str(data['createdAt'])
            history.append(data)
        
        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """AI 사용 통계"""
    if not db:
        return jsonify({'error': 'Firebase not connected'}), 503
        
    try:
        stats_doc = db.collection('statistics').document('ai_usage').get()
        if stats_doc.exists:
            return jsonify(stats_doc.to_dict())
        return jsonify({'total_swaps': 0})
    except Exception as e:
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
        print("\n.env 파일 예시:")
        print("CLIENT_ID=your_akool_client_id")
        print("CLIENT_SECRET=your_akool_client_secret")
        exit(1)
    
    print("\n" + "="*50)
    print("🚀 HAIRGATOR Face Swap 서버 시작")
    print("="*50)
    print(f"📡 서버 주소: http://localhost:3008")
    print(f"🔑 AKOOL Client ID: {CLIENT_ID[:10]}...")
    print(f"🔥 Firebase: {'연결됨' if db else '미연결 (선택사항)'}")
    print("✅ CORS: 모든 도메인 허용")
    print("="*50 + "\n")
    
    app.run(debug=True, port=3008, host='0.0.0.0')
