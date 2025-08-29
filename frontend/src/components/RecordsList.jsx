import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  Button
} from '@mui/material';
import { 
  Visibility as ViewIcon, 
  Refresh as RefreshIcon,
  ArrowBack as BackIcon 
} from '@mui/icons-material';
import { healthEducationAPI } from '../services/api';

const RecordsList = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await healthEducationAPI.getEducationRecords();
      setRecords(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '載入記錄時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleViewRecord = (recordId) => {
    navigate(`/records/${recordId}`);
  };

  const handleRefresh = () => {
    fetchRecords();
  };

  const handleBackToGenerator = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            📊 衛教記錄列表
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handleBackToGenerator}
              sx={{ mr: 1 }}
            >
              回到生成器
            </Button>
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {records.length === 0 && !loading ? (
          <Alert severity="info">
            目前沒有衛教記錄。請先使用生成器建立衛教資料。
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>患者姓名</TableCell>
                  <TableCell align="center">CAC 積分</TableCell>
                  <TableCell align="center">風險等級</TableCell>
                  <TableCell align="center">生成時間</TableCell>
                  <TableCell align="center">查看</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {record.patient_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {record.id}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {record.cac_score}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getRiskLevelText(record.risk_level)}
                        color={getRiskLevelColor(record.risk_level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {new Date(record.created_at).toLocaleDateString('zh-TW')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(record.created_at).toLocaleTimeString('zh-TW')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => handleViewRecord(record.id)}
                        size="small"
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            共 {records.length} 筆記錄
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RecordsList;