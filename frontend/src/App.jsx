import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box, Button, Tabs, Tab } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PatientEducation from './components/PatientEducation';


import EducationGenerator from './components/EducationGenerator';
import RecordsList from './components/RecordsList';
import RecordDetail from './components/RecordDetail';
import SystemStatus from './components/SystemStatus';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", "Microsoft JhengHei", sans-serif',
  },
});

function ModelDisplay() {
  const [currentModel, setCurrentModel] = useState('Llama 3.1 8B'); // 預設值
  
  useEffect(() => {
    // 監聽模型變更事件
    const handleModelChange = (event) => {
      setCurrentModel(event.detail.modelName);
    };
    
    window.addEventListener('modelChanged', handleModelChange);
    
    return () => {
      window.removeEventListener('modelChanged', handleModelChange);
    };
  }, []);

  return (
    <Typography variant="body2" sx={{ opacity: 0.8 }}>
      目前模型 {currentModel}
    </Typography>
  );
}

function NavigationTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getTabValue = (pathname) => {
    if (pathname === '/') return 0;
    if (pathname === '/patients') return 1;  // 新增
    if (pathname.startsWith('/records')) return 2;  // 改為2
    if (pathname === '/status') return 3;  // 改為3
    return 0;
  };

  const handleTabChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/patients');  // 新增
        break;
      case 2:
        navigate('/records');
        break;
      case 3:
        navigate('/status');
        break;
    }
  };

  return (
    <Tabs 
      value={getTabValue(location.pathname)} 
      onChange={handleTabChange}
      textColor="inherit"
      indicatorColor="secondary"
    >
      <Tab label="生成衛教資料" />
      <Tab label="病患管理" />  {/* 新增 */}
      <Tab label="歷史記錄" />
      <Tab label="系統狀態" />
    </Tabs>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <LocalHospitalIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component="div" sx={{ mr: 4 }}>
                CAC 衛教單自動生成器
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <NavigationTabs />
              </Box>
              <ModelDisplay />
            </Toolbar>
          </AppBar>
          
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route path="/" element={<EducationGenerator />} />
              <Route path="/patients" element={<PatientEducation />} />
              <Route path="/records" element={<RecordsList />} />
              <Route path="/records/:id" element={<RecordDetail />} />
              <Route path="/status" element={<SystemStatus />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;