import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10分鐘超時 (600秒)，給 LLM 足夠的生成時間
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    console.log('發送請求:', config.method?.toUpperCase(), config.url);
    console.log('請求資料:', config.data);
    return config;
  },
  (error) => {
    console.error('請求攔截器錯誤:', error);
    return Promise.reject(error);
  }
);

// 回應攔截器
api.interceptors.response.use(
  (response) => {
    console.log('收到回應:', response.status, response.config.url);
    console.log('回應資料:', response.data);
    return response;
  },
  (error) => {
    console.error('API 錯誤詳細資訊:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    
    // 提供更具體的錯誤訊息
    if (error.code === 'ECONNABORTED') {
      error.message = '請求超時，LLM 生成時間較長，請稍後查看歷史記錄';
    } else if (error.code === 'ERR_NETWORK') {
      error.message = '無法連接到後端服務，請確認後端是否啟動';
    }
    
    return Promise.reject(error);
  }
);

export const healthEducationAPI = {
  // 取得可用模型列表 - 新增
  getAvailableModels: () => api.get('/models'),
  
  // 檢查 Ollama 服務狀態
  checkOllamaHealth: () => api.post('/health-check/ollama'),
  
  // 生成衛教資料 - 使用更長的超時時間
  generateEducation: (educationRequest) => 
    api.post('/generate-education', educationRequest, {
      timeout: 600000, // 10分鐘超時，專門給生成請求更長時間
    }),
  
  // 取得衛教記錄列表
  getEducationRecords: (skip = 0, limit = 100) => 
    api.get(`/education-records?skip=${skip}&limit=${limit}`),
  
  // 取得特定衛教記錄
  getEducationRecord: (recordId) => 
    api.get(`/education-records/${recordId}`),
  
  // 建立 Prompt 模板
  createPromptTemplate: (template) => 
    api.post('/prompt-templates', template),
  
  // 取得 Prompt 模板列表
  getPromptTemplates: (category = null) => 
    api.get('/prompt-templates', { params: { category } }),
};

export default api;