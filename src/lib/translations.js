export const translations = {
  en: {
    // Navigation
    nav_home: 'Overview',
    nav_history: 'History',
    nav_wallets: 'Wallets',
    nav_auto: 'Auto',
    nav_insights: 'Insights',
    nav_intel: 'Financial Intel',
    nav_setup: 'Setup',
    nav_logout: 'Logout',
    
    // Dashboard
    dash_total_assets: 'Total Assets',
    dash_monthly_income: 'Monthly Income',
    dash_monthly_expense: 'Monthly Expense',
    dash_active_workspace: 'Active Workspace',
    dash_personal_account: 'Personal Account',
    dash_cloud_sync: 'Cloud Sync',
    dash_wallets_active: 'Wallets Active',
    dash_quick_actions: 'Quick Actions',
    dash_add_transaction: 'Add Transaction',
    dash_add_wallet: 'New Wallet',
    dash_recent_activity: 'Recent Activity',
    
    // Transactions
    tx_activity: 'Activity / Classification',
    tx_wallet: 'Wallet',
    tx_timestamp: 'Timestamp',
    tx_action: 'Action',
    tx_export: 'Export',
    tx_clear: 'Clear/Show All',
    tx_delete_confirm: 'Delete transactions?',
    
    // Wallets
    wallet_name: 'Account Name',
    wallet_type: 'Account Type',
    wallet_balance: 'Current Balance',
    wallet_initial: 'Initial Balance',
    wallet_create: 'Create Account',
    
    // Settings
    settings_security: 'Account Security',
    settings_household: 'Household Members',
    settings_cloud_share: 'Cloud Access Management',
    settings_revoke: 'Revoke Access',
    settings_invite: 'Send Cloud Invitation',
    settings_send_invite: 'Send Invitation',
    settings_username: 'Display Name / Username',
    settings_password: 'New Password',
    settings_confirm: 'Confirm New Password',
    settings_new_password: 'New Password',
    settings_confirm_password: 'Confirm New Password',
    settings_sync: 'Sync with Supabase',

    
    // Reports
    report_liquidity: 'Total Liquidity In',
    report_capital: 'Total Capital Out',
    report_retention: 'Net Retention',
    report_distribution: 'Expense Distribution',
    report_momentum: 'Monthly Momentum',
    report_print: 'Print / PDF',
    report_master: 'Master Ledger',
    
    // General
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error'
  },
  ko: {
    // Navigation
    nav_home: '개요',
    nav_history: '거래 내역',
    nav_wallets: '자산/지갑',
    nav_auto: '자동 이체',
    nav_insights: 'AI 분석',
    nav_intel: '금융 리포트',
    nav_setup: '설정',
    nav_logout: '로그아웃',
    
    // Dashboard
    dash_total_assets: '총 자산',
    dash_monthly_income: '이번 달 수입',
    dash_monthly_expense: '이번 달 지출',
    dash_active_workspace: '활성 워크스페이스',
    dash_personal_account: '개인 계정',
    dash_cloud_sync: '클라우드 동기화',
    dash_wallets_active: '개의 지갑 연결됨',
    dash_quick_actions: '빠른 실행',
    dash_add_transaction: '내역 추가',
    dash_add_wallet: '지갑 추가',
    dash_recent_activity: '최근 활동',
    
    // Transactions
    tx_activity: '활동 / 카테고리',
    tx_wallet: '지갑',
    tx_timestamp: '날짜',
    tx_action: '관리',
    tx_export: '내보내기',
    tx_clear: '필터 초기화',
    tx_delete_confirm: '내역을 삭제하시겠습니까?',
    
    // Wallets
    wallet_name: '계좌/지갑 이름',
    wallet_type: '계좌 유형',
    wallet_balance: '현재 잔액',
    wallet_initial: '초기 잔고',
    wallet_create: '계좌 생성',
    
    // Settings
    settings_security: '계정 보안',
    settings_household: '가족/구성원 관리',
    settings_cloud_share: '클라우드 액세스 관리',
    settings_revoke: '권한 회수',
    settings_invite: '클라우드 초대 보내기',
    settings_send_invite: '초대장 발송',
    settings_username: '사용자 이름 / 닉네임',
    settings_password: '새 비밀번호',
    settings_confirm: '비밀번호 확인',
    settings_new_password: '새 비밀번호',
    settings_confirm_password: '비밀번호 확인',
    settings_sync: '저장 및 동기화',

    
    // Reports
    report_liquidity: '총 수입 (유입)',
    report_capital: '총 지출 (유출)',
    report_retention: '순수익 (잔존)',
    report_distribution: '지출 분포',
    report_momentum: '월별 흐름',
    report_print: '인쇄 / PDF 저장',
    report_master: '전체 장부 추출',
    
    // General
    save: '저장',
    cancel: '취소',
    delete: '삭제',
    loading: '로딩 중...',
    success: '완료되었습니다',
    error: '오류가 발생했습니다'
  }
};

export const useTranslation = (lang) => {
  return (key) => translations[lang]?.[key] || key;
};
