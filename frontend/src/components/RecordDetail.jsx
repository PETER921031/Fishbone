import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as BackIcon, 
  Print as PrintIcon,
  Share as ShareIcon 
} from '@mui/icons-material';
import { healthEducationAPI } from '../services/api';

const RecordDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getRiskLevelColor = (riskLevel) => {
  switch (riskLevel) {
    case 'Low': return 'success';
    case 'High': return 'error';
    case 'Moderate': return 'success'; // 將 Moderate 對應到低風險顏色
    default: return 'default';
  }
};

const getRiskLevelText = (riskLevel) => {
  const riskMap = {
    'Low': '低風險 (CAC<100)',
    'High': '高風險 (CAC≥100)',
    'Moderate': '低風險 (CAC<100)' // 將 Moderate 統一顯示為低風險
  };
  return riskMap[riskLevel] || riskLevel;
};

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await healthEducationAPI.getEducationRecord(id);
        setRecord(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || '載入記錄詳情時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRecord();
    }
  }, [id]);

  const handleBack = () => {
    navigate('/records');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${record.patient_name} 的 CAC 衛教資料`,
          text: record.generated_content,
          url: window.location.href
        });
      } catch (err) {
        console.log('分享失敗:', err);
      }
    } else {
      // 複製到剪貼簿
      try {
        await navigator.clipboard.writeText(record.generated_content);
        alert('衛教內容已複製到剪貼簿');
      } catch (err) {
        console.log('複製失敗:', err);
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="outlined" onClick={handleBack} startIcon={<BackIcon />}>
            返回記錄列表
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Alert severity="info">找不到指定的記錄</Alert>
          <Button variant="outlined" onClick={handleBack} startIcon={<BackIcon />}>
            返回記錄列表
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        {/* 標題和操作按鈕 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            📋 衛教記錄詳情
          </Typography>
          <Box>
            <IconButton onClick={handlePrint} color="primary" title="列印">
              <PrintIcon />
            </IconButton>
            <IconButton onClick={handleShare} color="primary" title="分享" sx={{ ml: 1 }}>
              <ShareIcon />
            </IconButton>
            <Button
              variant="outlined"
              onClick={handleBack}
              startIcon={<BackIcon />}
              sx={{ ml: 2 }}
            >
              返回列表
            </Button>
          </Box>
        </Box>

        {/* 患者資訊 */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              👤 患者資訊
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Chip label={`患者: ${record.patient_name}`} variant="outlined" />
              </Grid>
              <Grid item>
                <Chip label={`CAC積分: ${record.cac_score}`} variant="outlined" />
              </Grid>
              <Grid item>
                <Chip 
                  label={`風險等級: ${getRiskLevelText(record.risk_level)}`} 
                  color={getRiskLevelColor(record.risk_level)}
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`生成時間: ${new Date(record.created_at).toLocaleString('zh-TW')}`} 
                  variant="outlined" 
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 3 }} />

        {/* 衛教內容 */}
        <Typography variant="h6" gutterBottom>
          📄 衛教內容
        </Typography>
        
        <Card variant="outlined" sx={{ mb: 3 }}>
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
  {record.generated_content}
</ReactMarkdown>
          </CardContent>
        </Card>

        {/* 記錄資訊 */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            記錄ID: {record.id} | 
            生成時間: {new Date(record.created_at).toLocaleString('zh-TW')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RecordDetail;