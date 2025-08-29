import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Box,
  Tabs,
  Tab,
  Chip,
  Divider,
  Paper,
  FormHelperText,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  Assignment as ResultIcon,
  LocalHospital as HealthIcon,
  Assessment as ScoreIcon,
  Info as InfoIcon,
  Memory as ModelIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { healthEducationAPI } from '../services/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EducationGenerator = () => {
  const { control, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
  defaultValues: {
    patientName: '',
    patientAge: '',
    cacScore: '',
    gender: '',
    medicalHistory: '',
    lifestyleFactors: '',
    contentType: '',
    selectedModel: '' // 確保有預設值
  }
});
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  

  // 監控 CAC 分數變化以顯示風險等級
  const cacScore = watch('cacScore');
  
  // 🔧 修復：監控選中的模型
  const selectedModel = watch('selectedModel');

  const contentTypes = [
    { value: 'risk_assessment', label: '風險評估', description: '評估心血管風險並提供預防建議' },
    { value: 'lifestyle', label: '生活型態建議', description: '飲食、運動、生活習慣改善指導' },
    { value: 'medication', label: '藥物治療衛教', description: '藥物使用指導與注意事項' }
  ];

  // 載入可用模型列表 - 優化錯誤處理
  useEffect(() => {
    const loadModels = async () => {
      try {
        setModelsLoading(true);
        console.log('正在載入模型列表...');
        const response = await healthEducationAPI.getAvailableModels();
        console.log('模型列表回應:', response.data);
        
        if (response.data?.models && Array.isArray(response.data.models)) {
          setAvailableModels(response.data.models);
          console.log('成功載入模型:', response.data.models);
        } else {
          throw new Error('無效的模型列表格式');
        }
      } catch (error) {
        console.error('載入模型列表失敗:', error);
        // 設定預設模型列表作為備案
        const fallbackModels = [
          {
            name: "llama3.1:8b",
            display_name: "Llama 3.1 8B",
            description: "高品質通用模型，適合複雜任務"
          },
          {
            name: "llama3.2:3b", 
            display_name: "Llama 3.2 3B",
            description: "輕量快速模型，適合簡單任務"
          },
          {
            name: "mistral:7b",
            display_name: "Mistral 7B", 
            description: "平衡性能與資源的優秀模型"
          }
        ];
        setAvailableModels(fallbackModels);
        console.warn('使用預設模型列表');
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, []);

  // 🔧 修復：監控模型選擇變化的調試
  useEffect(() => {
    console.log('當前選中模型:', selectedModel);
    console.log('可用模型列表:', availableModels);
  }, [selectedModel, availableModels]);

  const getRiskLevel = (cacScore) => {
    const score = parseFloat(cacScore) || 0;
    if (score < 100) return { level: 'Low', color: 'success', text: '低風險', bgcolor: '#e8f5e8' };
    return { level: 'High', color: 'error', text: '高風險', bgcolor: '#ffebee' };
  };

  const getModelIcon = (modelName) => {
    if (modelName.includes('3b')) return <SpeedIcon sx={{ mr: 1, fontSize: 16 }} />;
    if (modelName.includes('mistral')) return <PsychologyIcon sx={{ mr: 1, fontSize: 16 }} />;
    return <ModelIcon sx={{ mr: 1, fontSize: 16 }} />;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('表單提交數據:', data); // 調試日誌
      console.log('選中的模型:', data.selectedModel); // 特別檢查模型
      
      const educationRequest = {
        patient_info: {
          patient_name: data.patientName,
          patient_age: parseInt(data.patientAge),
          cac_score: parseFloat(data.cacScore),
          gender: data.gender,
          medical_history: data.medicalHistory || '',
          lifestyle_factors: data.lifestyleFactors || ''
        },
        content_type: data.contentType,
        // 🔧 修復：確保模型參數正確傳遞
        model: data.selectedModel || null,
        language: 'zh-TW'
      };

      console.log('發送到後端的請求:', educationRequest); // 調試日誌

      const response = await healthEducationAPI.generateEducation(educationRequest);

      if (response.status >= 200 && response.status < 300 && response.data) {
        setResult(response.data);
        setError(null);
        setTimeout(() => setTabValue(1), 100);
      } else {
        throw new Error(`API 響應異常: 狀態碼 ${response.status}`);
      }
    } catch (err) {
      console.error('生成錯誤:', err); // 調試日誌
      
      let errorMessage = '生成衛教資料時發生錯誤';

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = '生成時間較長導致請求超時，但後端可能仍在處理中。請稍後到「歷史記錄」查看是否已完成生成。';
      } else if (err.response) {
        if (err.response.data?.detail) errorMessage = err.response.data.detail;
        else if (err.response.status === 503) errorMessage = 'Ollama 服務暫時無法使用，請稍後再試';
        else if (err.response.status === 500) errorMessage = '伺服器內部錯誤，請檢查後端服務狀態';
        else errorMessage = `伺服器錯誤 (${err.response.status})`;
      } else if (err.request) {
        errorMessage = '無法連接到伺服器，請檢查後端服務是否啟動';
      } else {
        errorMessage = err.message || '未知錯誤';
      }

      setError(errorMessage);
      setTabValue(0);
    } finally {
      setLoading(false);
    }
  };

  const handleNewGeneration = () => {
    setResult(null);
    setError(null);
    setTabValue(0);
    reset();
  };

  const handleTabChange = (event, newValue) => {
    if (newValue === 1 && !result && !loading) return;
    setTabValue(newValue);
  };

  const currentRisk = cacScore ? getRiskLevel(cacScore) : null;

  return (
    <Card elevation={3} sx={{ borderRadius: 3, maxWidth: 1200, mx: 'auto' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500
              }
            }}
          >
            <Tab label="患者資訊輸入" icon={<PersonIcon />} iconPosition="start" />
            <Tab
              label="生成結果"
              icon={<ResultIcon />}
              iconPosition="start"
              disabled={!result && !loading}
              sx={{
                '&.Mui-disabled': {
                  opacity: (result || loading) ? 1 : 0.6,
                  color: (result || loading) ? 'primary.main' : 'text.disabled'
                }
              }}
            />
          </Tabs>
        </Box>

        {/* ======= 表單頁籤 ======= */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: { xs: 1.5, md: 2 } }}>
            {/* 頂部橫幅 */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                mb: 3,
                color: 'white',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                <HealthIcon sx={{ fontSize: 40 }} />
                <Typography variant="h4" fontWeight="bold">CAC 衛教單生成器</Typography>
              </Box>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                請輸入患者資訊以生成個人化的冠狀動脈鈣化衛教教材
              </Typography>
            </Paper>

            {/* 提示區 */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} icon={<InfoIcon />}>
                <Typography variant="body2" component="div">
                  <strong>錯誤：</strong>{error}
                </Typography>
              </Alert>
            )}
            {loading && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={<CircularProgress size={20} />}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>正在生成衛教資料，請稍候...</Typography>
                  <Typography variant="caption" color="text.secondary">LLM 生成通常需要一段時間，請耐心等待</Typography>
                  {selectedModel && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      使用模型: {availableModels.find(m => m.name === selectedModel)?.display_name || selectedModel}
                    </Typography>
                  )}
                </Box>
              </Alert>
            )}

            {/* 表單：左右兩欄排版 */}
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{
                position: 'relative',
                pb: { xs: 12, md: 14 } // 預留底部空間，避免內容被按鈕蓋住
              }}
            >
              <Grid container spacing={3}>
                {/* 左欄（md=7） */}
                <Grid item xs={12} md={7}>
                  {/* 基本資訊 */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      基本資訊
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="patientName"
                          control={control}
                          rules={{ required: '請輸入患者姓名' }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="患者姓名"
                              fullWidth
                              error={!!errors.patientName}
                              helperText={errors.patientName?.message}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Controller
                          name="patientAge"
                          control={control}
                          rules={{
                            required: '請輸入年齡',
                            min: { value: 0, message: '年齡不能小於0' },
                            max: { value: 120, message: '年齡不能大於120' }
                          }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="年齡"
                              type="number"
                              fullWidth
                              error={!!errors.patientAge}
                              helperText={errors.patientAge?.message}
                              InputProps={{ endAdornment: <InputAdornment position="end">歲</InputAdornment> }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        />
                      </Grid>
                      

<Grid item xs={12} sm={3}>
  <FormControl
    fullWidth
    error={!!errors.gender}
    sx={{ 
      '& .MuiOutlinedInput-root': { borderRadius: 2 },
      minWidth: 120
    }}
  >
    <InputLabel id="gender-label">性別</InputLabel>
    <Controller
      name="gender"
      control={control}
      rules={{ required: '請選擇性別' }}
      render={({ field }) => (
        <Select
          {...field}
          labelId="gender-label"
          id="gender"
          label="性別"
          displayEmpty={false}
          value={field.value || ''}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 200,
                '& .MuiMenuItem-root': {
                  fontSize: '0.875rem',
                  minHeight: 36
                }
              }
            }
          }}
        >
          <MenuItem value="male">男性</MenuItem>
          <MenuItem value="female">女性</MenuItem>
        </Select>
      )}
    />
    {errors.gender && <FormHelperText>{errors.gender.message}</FormHelperText>}
  </FormControl>
</Grid>
                    </Grid>
                  </Paper>

                  {/* 🔧 修復：模型選擇區塊 */}
                  

<Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <ModelIcon sx={{ mr: 1, color: 'primary.main' }} />
    LLM 模型選擇
  </Typography>
  <FormControl fullWidth error={!!errors.selectedModel}>
    <InputLabel id="model-select-label">選擇 AI 模型</InputLabel>
    <Controller
      name="selectedModel"
      control={control}
      render={({ field }) => (
        <Select 
          {...field}
          labelId="model-select-label"
          label="選擇 AI 模型" 
          sx={{ borderRadius: 2 }}
          disabled={modelsLoading}
          displayEmpty
          value={field.value || ''}
          onChange={(event) => {
            const selectedValue = event.target.value;
            console.log('模型選擇變化:', selectedValue);
            field.onChange(selectedValue);
            
            // 🔧 加入事件發送給 App.jsx
            const modelObj = availableModels.find(m => m.name === selectedValue);
            const displayName = modelObj ? modelObj.display_name : selectedValue || 'Llama 3.1 8B';
            
            window.dispatchEvent(new CustomEvent('modelChanged', {
              detail: { modelName: displayName }
            }));
          }}
        >
          {modelsLoading ? (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                載入模型列表中...
              </Box>
            </MenuItem>
          ) : (
            [
              <MenuItem key="default" value="">
                <em></em>
              </MenuItem>,
              ...availableModels.map((model) => (
                <MenuItem key={model.name} value={model.name}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getModelIcon(model.name)}
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {model.display_name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {model.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            ]
          )}
        </Select>
      )}
    />
    <FormHelperText>
      {selectedModel ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getModelIcon(selectedModel)}
          <span>已選擇: {availableModels.find(m => m.name === selectedModel)?.display_name || selectedModel}</span>
        </Box>
      ) : (
        '選擇不同的 AI 模型會影響生成速度和內容品質'
      )}
    </FormHelperText>
  </FormControl>
</Paper>

                  {/* 衛教內容設定 */}
                  

<Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <ResultIcon sx={{ mr: 1, color: 'primary.main' }} />
    衛教內容設定
  </Typography>
  <FormControl fullWidth error={!!errors.contentType}>
    <InputLabel>衛教內容類型</InputLabel>
    <Controller
      name="contentType"
      control={control}
      rules={{ required: '請選擇衛教內容類型' }}
      render={({ field }) => (
        <Select 
          {...field} 
          label="衛教內容類型" 
          sx={{ borderRadius: 2 }}
          value={field.value || ''}
        >
          {contentTypes.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              <Box>
                <Typography variant="body1">{type.label}</Typography>
                <Typography variant="caption" color="text.secondary">{type.description}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      )}
    />
    {errors.contentType && <FormHelperText>{errors.contentType.message}</FormHelperText>}
  </FormControl>
</Paper>
                </Grid>

                {/* 右欄（md=5） */}
                <Grid item xs={12} md={5}>
                  {/* CAC 分數與風險 */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ScoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                      CAC 分數與風險評估
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Controller
                          name="cacScore"
                          control={control}
                          rules={{
                            required: '請輸入CAC積分',
                            min: { value: 0, message: 'CAC積分不能小於0' }
                          }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="CAC 積分"
                              type="number"
                              fullWidth
                              error={!!errors.cacScore}
                              helperText={errors.cacScore?.message || 'Coronary Artery Calcium Score'}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        />
                      </Grid>

                      {currentRisk && (
                        <Grid item xs={12}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2.5,
                              bgcolor: currentRisk.bgcolor,
                              borderRadius: 2,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Typography variant="subtitle2" color="text.secondary">風險等級</Typography>
                            <Chip label={currentRisk.text} color={currentRisk.color} sx={{ fontWeight: 'bold' }} />
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>

                  {/* 詳細資訊（選填） */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <HealthIcon sx={{ mr: 1, color: 'primary.main' }} />
                      詳細資訊（選填）
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Controller
                          name="medicalHistory"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="病史"
                              multiline
                              rows={3}
                              fullWidth
                              placeholder="如：高血壓、糖尿病、心臟病史等"
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller
                          name="lifestyleFactors"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="生活型態因子"
                              multiline
                              rows={3}
                              fullWidth
                              placeholder="如：抽菸、飲酒、運動習慣、飲食狀況等"
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* 送出按鈕：定位在表單容器的右下角（非視窗右下） */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{
                  position: 'absolute',
                  right: { xs: 16, md: 24 },
                  bottom: { xs: 16, md: 24 },
                  px: 3,
                  py: 1.8,
                  minWidth: 220,
                  borderRadius: 3,
                  boxShadow: 3,
                  background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1976d2 0%, #1e88e5 100%)' }
                }}
              >
                {loading ? '正在生成衛教資料...' : '生成衛教資料'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ======= 結果頁籤 ======= */}
        <TabPanel value={tabValue} index={1}>
          {result && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ResultIcon sx={{ mr: 1, color: 'primary.main' }} />
                  衛教資料生成完成
                </Typography>
                <Button variant="outlined" onClick={handleNewGeneration} sx={{ borderRadius: 2 }}>
                  重新生成
                </Button>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item><Chip label={`患者: ${result.patient_name}`} variant="outlined" /></Grid>
                <Grid item><Chip label={`CAC積分: ${result.cac_score}`} variant="outlined" /></Grid>
                <Grid item>
                  <Chip
                    label={`風險等級: ${getRiskLevel(result.cac_score).text}`}
                    color={getRiskLevel(result.cac_score).color}
                  />
                </Grid>
                {result.model_used && (
                  <Grid item>
                    <Chip 
                      label={`使用模型: ${result.model_used}`} 
                      variant="outlined" 
                      color="info"
                      icon={<ModelIcon />}
                    />
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ mb: 3 }} />

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <ReactMarkdown 
  components={{
    h1: ({children}) => <Typography variant="h4" gutterBottom>{children}</Typography>,
    h2: ({children}) => <Typography variant="h5" gutterBottom>{children}</Typography>, 
    h3: ({children}) => <Typography variant="h6" gutterBottom>{children}</Typography>,
    p: ({children}) => <Typography variant="body1" paragraph>{children}</Typography>,
    strong: ({children}) => <Typography component="strong" sx={{fontWeight: 'bold'}}>{children}</Typography>,
    ul: ({children}) => <Box component="ul" sx={{ml: 2}}>{children}</Box>,
    li: ({children}) => <Typography component="li" variant="body1">{children}</Typography>
  }}
>
  {result.generated_content}
</ReactMarkdown>
                </CardContent>
              </Card>

              <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  生成時間: {new Date(result.created_at).toLocaleString('zh-TW')} | 記錄ID: {result.id}
                  {result.model_used && ` | 使用模型: ${result.model_used}`}
                </Typography>
              </Paper>
            </Box>
          )}

          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>正在生成衛教資料...</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                LLM 生成通常需要一段時間<br/>請耐心等待，不要關閉頁面
              </Typography>
              {selectedModel && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                  使用模型: {availableModels.find(m => m.name === selectedModel)?.display_name || selectedModel}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                💡 提示：如果超時，請稍後到「歷史記錄」查看生成結果
              </Typography>
            </Box>
          )}
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default EducationGenerator;



