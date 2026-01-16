// HAIRGATOR 부하 테스트 스크립트
// 실행: k6 run load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://app.hairgator.kr';

export default function () {
  // 1. 메인 페이지
  let res = http.get(BASE_URL + '/');
  check(res, { 'main 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // 2. JS 파일
  res = http.get(BASE_URL + '/js/main.js');
  check(res, { 'js 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // 3. CSS 파일
  res = http.get(BASE_URL + '/css/main.css');
  check(res, { 'css 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // 4. 챗봇 페이지
  res = http.get(BASE_URL + '/chatbot.html');
  check(res, { 'chatbot 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // 5. 스타일매치 페이지
  res = http.get(BASE_URL + '/style-match/index.html');
  check(res, { 'style-match 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  
  sleep(Math.random() * 2 + 1);
}
