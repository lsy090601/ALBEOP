-- profiles.contract_plan → housing_contract_plan로 이름 변경
-- 실제 의미가 "근로계약"이 아니라 "1년 안에 주거 계약(전월세 등) 예정"이라 컬럼명을 명확히 한다.
-- 대시보드에서 확인한 결과 현재 컬럼명은 contract_plan이라 rename으로 처리한다.

alter table profiles rename column contract_plan to housing_contract_plan;
