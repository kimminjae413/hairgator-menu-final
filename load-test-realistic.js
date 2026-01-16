// 하루 1000명 방문자 시뮬레이션
// 피크 시간대 (8시간) 집중 가정
// 1000명 / 8시간 = 125명/시간 = ~2명/분
// 동시 접속: 5-10명 수준

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    realistic_load: {
      executor: 'ramping-arrival-rate',
      startRate: 1,           // 시작: 1 req/분
      timeUnit: '1m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '30s', target: 2 },   // 2 req/분 (한산한 시간)
        { duration: '1m', target: 5 },    // 5 req/분 (보통)
        { duration: '1m', target: 10 },   // 10 req/분 (피크)
        { duration: '30s', target: 2 },   // 2 req/분 (감소)
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'https://app.hairgator.kr';

export default function () {
  // 실제 사용자 시나리오: 페이지 방문 → 여러 리소스 로드
  
  // 1. 메인 페이지 접속
  let res = http.get(BASE_URL + '/');
  check(res, { 'main 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  
  // 2. JS/CSS 로드 (브라우저가 자동으로 하는 것)
  http.batch([
    ['GET', BASE_URL + '/js/main.js'],
    ['GET', BASE_URL + '/css/main.css'],
    ['GET', BASE_URL + '/js/menu.js'],
  ]);
  
  // 3. 사용자 체류 시간 (10-30초)
  sleep(Math.random() * 20 + 10);
  
  // 4. 다른 페이지로 이동 (50% 확률)
  if (Math.random() > 0.5) {
    res = http.get(BASE_URL + '/chatbot.html');
    check(res, { 'chatbot 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    sleep(Math.random() * 15 + 5);
  }
}
