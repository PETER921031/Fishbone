import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Computer as ServerIcon,
  Storage as DatabaseIcon,
  Psychology as AIIcon
} from '@mui/icons-material';
import { healthEducationAPI } from '../services/api';

const SystemStatus = () => {
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState(null); // ✅ 新增動態資料庫狀態
  const [systemStats, setSystemStats] = useState(null); // ✅ 新增系統統計資料
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const checkSystemStatus = async () => {
    setLoading(true);
    
    try {
      // ✅ 檢查 API 連線和資料庫狀態
      const apiResponse = await fetch('http://localhost:8000/health');
      const apiData = await apiResponse.json();
      
      setApiStatus({
        status: apiResponse.ok && apiData.status === 'healthy' ? 'healthy' : 'error',
        message: apiResponse.ok ? 'API 服務正常' : 'API 服務異常'
      });

      // ✅ 動態檢查資料庫狀態（從 API 回應中取得）
      setDatabaseStatus({
        status: apiData.database === 'connected' ? 'healthy' : 'error',
        message: apiData.database === 'connected' ? '資料庫連線正常' : '資料庫連線失敗'
      });

      // ✅ 檢查 Ollama 狀態
      try {
        await healthEducationAPI.checkOllamaHealth();
        setOllamaStatus({
          status: 'healthy',
          message: 'Ollama 服務正常，模型已載入'
        });
      } catch (err) {
        setOllamaStatus({
          status: 'error',
          message: err.response?.data?.detail || 'Ollama 服務連線失敗'
        });
      }

      // ✅ 取得系統統計資料
      try {
        const statsResponse = await fetch('http://localhost:8000/api/v1/statistics');
        const statsData = await statsResponse.json();
        setSystemStats(statsData);
      } catch (err) {
        console.warn('無法取得統計資料:', err);
      }

    } catch (err) {
      setApiStatus({
        status: 'error',
        message: 'API 服務無法連接'
      });
      setDatabaseStatus({
        status: 'error',
        message: '無法檢查資料庫狀態'
      });
    }
    
    setLoading(false);
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkSystemStatus();
    
    // ✅ 每30秒自動刷新一次
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const systemComponents = [
    {
      name: 'FastAPI 後端服務',
      icon: <ServerIcon />,
      status: apiStatus?.status,
      message: apiStatus?.message || '檢查中...',
      details: 'RESTful API 服務，處理前後端通訊'
    },
    {
      name: 'Ollama + Llama 3.1 8B',
      icon: <AIIcon />,
      status: ollamaStatus?.status,
      message: ollamaStatus?.message || '檢查中...',
      details: '大語言模型服務，負責生成衛教內容'
    },
    {
      name: 'PostgreSQL 資料庫',
      icon: <DatabaseIcon />,
      status: databaseStatus?.status, // ✅ 改為動態狀態
      message: databaseStatus?.message || '檢查中...', // ✅ 改為動態訊息
      details: '儲存患者資料和衛教記錄'
    }
  ];

  const overallStatus = systemComponents.every(c => c.status === 'healthy') ? 'healthy' : 
                       systemComponents.some(c => c.status === 'error') ? 'error' : 'checking';

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            🔧 系統狀態監控
          </Typography>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={checkSystemStatus}
            disabled={loading}
          >
            {loading ? '檢查中...' : '重新檢查'}
          </Button>
        </Box>

        {/* 整體狀態 */}
        <Alert 
          severity={overallStatus === 'healthy' ? 'success' : overallStatus === 'error' ? 'error' : 'info'}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle1">
            系統整體狀態: {' '}
            <Chip 
              label={overallStatus === 'healthy' ? '正常運行' : overallStatus === 'error' ? '部分異常' : '檢查中'} 
              color={getStatusColor(overallStatus)} 
              size="small" 
            />
          </Typography>
        </Alert>

        {/* 各元件狀態 */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          📊 各元件狀態
        </Typography>

        <Grid container spacing={2}>
          {systemComponents.map((component, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {component.icon}
                    <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                      {component.name}
                    </Typography>
                    {getStatusIcon(component.status)}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {component.details}
                  </Typography>
                  
                  <Chip
                    label={component.message}
                    color={getStatusColor(component.status)}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ✅ 系統統計資料 */}
        {systemStats && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              📈 系統統計
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {systemStats.total_records}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      總衛教記錄數
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">
                      {systemStats.total_templates}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      提示詞模板數
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {Object.keys(systemStats.risk_level_distribution || {}).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      風險等級類型
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* 風險等級分布 */}
            {systemStats.risk_level_distribution && Object.keys(systemStats.risk_level_distribution).length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  風險等級分布:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(systemStats.risk_level_distribution).map(([level, count]) => (
                    <Chip 
                      key={level}
                      label={`${level}: ${count}`}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        {/* 系統資訊 */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          ℹ️ 系統資訊
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <AIIcon />
            </ListItemIcon>
            <ListItemText
              primary="AI 模型"
              secondary="Llama 3.1 8B - Meta 開源大語言模型"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ServerIcon />
            </ListItemIcon>
            <ListItemText
              primary="後端框架"
              secondary="FastAPI + Python 3.9+ 高效能異步框架"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <DatabaseIcon />
            </ListItemIcon>
            <ListItemText
              primary="資料庫"
              secondary="PostgreSQL 關聯式資料庫"
            />
          </ListItem>
        </List>

        {/* 最後檢查時間 */}
        {lastCheck && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              最後檢查時間: {lastCheck.toLocaleString('zh-TW')}
              {' | '}
              自動刷新: 每 30 秒
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemStatus;