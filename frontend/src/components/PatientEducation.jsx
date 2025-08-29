import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, 
  FormControl, InputLabel, Select, MenuItem,
  Button, CircularProgress, Alert, Divider
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import api, { healthEducationAPI } from '../services/api';

const PatientEducation = () => {
  const [patients, setPatients] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [contentType, setContentType] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 載入病患和模型列表
  useEffect(() => {
    loadPatients();
    loadModels();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (err) {
      console.error('載入病患列表錯誤:', err);
      setError('載入病患列表失敗');
    }
  };

  const loadModels = async () => {
    try {
      const response = await healthEducationAPI.getAvailableModels();
      // 為模型添加描述
      const modelsWithDescription = response.data.models.map(model => {
        console.log('Model name:', model.name); // Debug 用
        return {
          ...model,
          description: getModelDescription(model.name)
        };
      });
      console.log('Models with description:', modelsWithDescription); // Debug 用
      setModels(modelsWithDescription);
    } catch (err) {
      console.error('載入模型列表錯誤:', err);
      setError('載入模型列表失敗');
    }
  };

  // 根據模型名稱返回對應的描述
  const getModelDescription = (modelName) => {
    const descriptions = {
      'llama-3.1-8b': '高品質通用模型，適合複雜任務',
      'Llama 3.1 8B': '高品質通用模型，適合複雜任務',
      'llama-3.2-3b': '輕量快速模型，適合簡單任務',
      'Llama 3.2 3B': '輕量快速模型，適合簡單任務',
      'mistral-7b': '平衡性能與資源的優秀模型',
      'Mistral 7B': '平衡性能與資源的優秀模型'
    };
    return descriptions[modelName] || '';
  };

  const handleGenerate = async () => {
    if (!selectedPatient || !contentType || !selectedModel) {
      setError('請選擇病患、內容類型和模型');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedContent('');
    
    try {
      const response = await api.post(`/patients/${selectedPatient}/education`, {
        patient_id: selectedPatient,
        content_type: contentType,
        model: selectedModel,
        language: 'zh-TW'
      });
      
      setGeneratedContent(response.data.generated_content);
      
      // 觸發模型變更事件，更新頂部模型顯示
      window.dispatchEvent(new CustomEvent('modelChanged', {
        detail: { modelName: selectedModel }
      }));
      
    } catch (err) {
      console.error('生成衛教內容錯誤:', err);
      const errorMessage = err.response?.data?.detail || err.message || '未知錯誤';
      setError('生成衛教內容失敗：' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedPatientInfo = patients.find(p => p.id === selectedPatient);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        病患衛教內容生成
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            選擇選項
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>選擇病患</InputLabel>
              <Select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                label="選擇病患"
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.id} - {patient.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>內容類型</InputLabel>
              <Select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                label="內容類型"
              >
                <MenuItem value="risk_assessment">風險評估</MenuItem>
                <MenuItem value="lifestyle">生活型態建議</MenuItem>
                <MenuItem value="medication">藥物治療衛教</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>選擇模型</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="選擇模型"
              >
                {models.map((model) => (
                  <MenuItem key={model.name} value={model.name}>
                    <Box>
                      <Typography variant="body1">
                        {model.display_name || model.name}
                      </Typography>
                      {model.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {model.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading || !selectedPatient || !contentType || !selectedModel}
              sx={{ height: 56 }}
            >
              {loading ? <CircularProgress size={24} /> : '生成衛教內容'}
            </Button>
          </Box>

          {selectedPatientInfo && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  病患資訊：{selectedPatientInfo.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  年齡：{selectedPatientInfo.age} 歲 | 
                  性別：{selectedPatientInfo.gender} | 
                  CAC積分：{selectedPatientInfo.cac_score}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  病史：{selectedPatientInfo.medical_history || '無記錄'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  生活型態：{selectedPatientInfo.lifestyle_factors || '無記錄'}
                </Typography>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {generatedContent && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              生成的衛教內容
            </Typography>
            <Divider sx={{ mb: 2 }} />
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
  {generatedContent}
</ReactMarkdown>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PatientEducation;