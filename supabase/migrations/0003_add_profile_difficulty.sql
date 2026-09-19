-- 온보딩(P1) 프로필 입력 폼: 나이대에 따른 콘텐츠 난이도 저장용 컬럼 추가

alter table profiles add column if not exists difficulty text default '보통';
