import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Calendar, Stethoscope } from 'lucide-react';

const FishboneTimeline = () => {
  // 固定的分支類型和對應的療程卡
  const branchTypes = {
    diagnosis: { name: '🩺診斷分支', color: '#3b82f6', bgColor: '#eff6ff' },
    treatment: { name: '🏥治療分支', color: '#dc2626', bgColor: '#fef2f2' },
    recovery: { name: '❤️復原分支', color: '#ea580c', bgColor: '#fff7ed' },
    tracking: { name: '📅追蹤分支', color: '#16a34a', bgColor: '#f0fdf4' }
  };

  // 預設的療程卡資料
  const initialBranches = [
    // 診斷分支
    { id: 1, type: 'diagnosis', side: 'top', position: 20, verticalOffset: -20, title: '門診', description: '病患就診，進行基本檢查', width: 192, height: 150 },
    { id: 2, type: 'diagnosis', side: 'top', position: 35, verticalOffset: -25, title: '急診', description: '急診檢查紀錄', width: 192, height: 150 },
    
    // 治療分支
    { id: 3, type: 'treatment', side: 'bottom', position: 45, verticalOffset: 20, title: '藥物、物理治療', description: '紀錄治療計畫', width: 192, height: 150 },
    { id: 4, type: 'treatment', side: 'bottom', position: 60, verticalOffset: 25, title: '住院天數', description: '紀錄住院情況及檢查種類', width: 192, height: 150 },
    { id: 5, type: 'treatment', side: 'bottom', position: 65, verticalOffset: 30, title: '手術執行', description: '手術方式、摘要', width: 192, height: 150 },
    
    // 復原分支
    { id: 6, type: 'recovery', side: 'top', position: 70, verticalOffset: -20, title: '復原評估', description: '評估治療效果與復原狀況', width: 192, height: 150 },
    { id: 7, type: 'recovery', side: 'top', position: 80, verticalOffset: -25, title: '康復訓練', description: '進行康復訓練計畫', width: 192, height: 150 },
    
    // 追蹤分支
    { id: 8, type: 'tracking', side: 'bottom', position: 85, verticalOffset: 20, title: '定期回診', description: '定期回診追蹤檢查', width: 192, height: 150 },
    { id: 9, type: 'tracking', side: 'bottom', position: 90, verticalOffset: 25, title: '長期追蹤', description: '長期健康狀況追蹤', width: 192, height: 150 }
  ];

// 從 localStorage 讀取儲存的位置資料
const loadSavedPositions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('fishbonePositions') || '{}');
    return initialBranches.map(branch => ({
      ...branch,
      position: saved[branch.id]?.position ?? branch.position,
      verticalOffset: saved[branch.id]?.verticalOffset ?? branch.verticalOffset,
      side: saved[branch.id]?.side ?? branch.side,
      width: saved[branch.id]?.width ?? branch.width,
      height: saved[branch.id]?.height ?? branch.height
    }));
  } catch (error) {
    console.error('載入儲存位置失敗', error);
    return initialBranches;
  }
};


// 儲存位置資料到 localStorage
const savePositions = (branchesData) => {
  const positionsToSave = {};
  branchesData.forEach(branch => {
    positionsToSave[branch.id] = {
      position: branch.position,
      verticalOffset: branch.verticalOffset,
      side: branch.side,
      width: branch.width,
      height: branch.height
    };
  });
  localStorage.setItem('fishbonePositions', JSON.stringify(positionsToSave));
};


  const [branches, setBranches] = useState(loadSavedPositions);
  const [activeBranch, setActiveBranch] = useState(null);
  const [patientsData, setPatientsData] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [draggedBranch, setDraggedBranch] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressStarted, setLongPressStarted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [cardScales, setCardScales] = useState({});
  const containerRef = useRef(null);

  // 監聽 branches 變化並自動儲存
  useEffect(() => {
    savePositions(branches);
  }, [branches]);

  // 更新分支狀態
  const updateBranch = (id, field, value) => {
    setBranches(branches.map(branch => 
      branch.id === id ? { ...branch, [field]: value } : branch
    ));
  };
  // 處理檔案匯入
const handleFileImport = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  setIsImporting(true);
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    setJsonData(data);
    updateBranchesFromJson(data);
  } catch (error) {
    alert('JSON檔案格式錯誤');
  } finally {
    setIsImporting(false);
  }
};

// 從JSON更新branches
const updateBranchesFromJson = (data) => {
  if (!data.patients || !Array.isArray(data.patients)) {
    alert('JSON格式錯誤：找不到patients陣列');
    return;
  }
  
  setPatientsData(data.patients);
  
  if (data.patients.length > 0) {
    const firstPatient = data.patients[0];
    setSelectedPatient(firstPatient);
    
    if (firstPatient.medicalRecords && firstPatient.medicalRecords.length > 0) {
      setSelectedRecord(firstPatient.medicalRecords[0]);
      mapRecordToBranches(firstPatient.medicalRecords[0], firstPatient);
    }
  }
};

// 映射記錄到branches
const mapRecordToBranches = (record, patient) => {
  const updatedBranches = branches.map(branch => {
    let newTitle = branch.title;
    let newDescription = branch.description;
    
    switch(branch.type) {
      case 'diagnosis':
        if (branch.id === 1) {
          newTitle = record.visitType || '門診';
          newDescription = `診斷：${record.diagnosis || '待填入'}\n主訴：${record.chiefComplaint || '待填入'}`;
        } else if (branch.id === 2) {
          newTitle = '急診';
          newDescription = record.emergencyInfo || '急診檢查紀錄';
        }
        break;
        
      case 'treatment':
        if (branch.id === 3) {
          newTitle = '藥物治療';
          const medications = record.medications || [];
          newDescription = medications.length > 0 
            ? medications.map(med => `${med.name || med} ${med.dosage || ''}`).join('\n')
            : '待填入用藥資訊';
        } else if (branch.id === 4) {
          newTitle = '住院記錄';
          newDescription = record.hospitalizationInfo || '紀錄住院情況及檢查種類';
        }
        break;
        
      case 'recovery':
        if (branch.id === 6) {
          newTitle = '復原評估';
          newDescription = record.recoveryAssessment || record.followUpPlan || '評估治療效果與復原狀況';
        }
        break;
        
      case 'tracking':
        if (branch.id === 8) {
          newTitle = '回診追蹤';
          newDescription = `下次回診：${record.nextAppointment || '待安排'}`;
        }
        break;
    }
    
    return { ...branch, title: newTitle, description: newDescription };
  });
  
  setBranches(updatedBranches);
};
  // 處理分支按鈕點擊
  const handleBranchClick = (branchType) => {
    if (activeBranch === branchType) {
      // 如果點擊的是當前激活的分支，則顯示所有卡片
      setActiveBranch(null);
      setBranches(branches.map(branch => ({ ...branch, isCollapsed: false })));
    } else {
      // 點擊新的分支，收起其他分支的卡片
      setActiveBranch(branchType);
      setBranches(branches.map(branch => ({
        ...branch,
        isCollapsed: branch.type !== branchType
      })));
    }
  };

  // 檢查滑鼠是否在卡片邊緣
  const getEdgeType = (e, cardRef) => {
    if (!cardRef) return null;
    
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const edgeThreshold = 10;
    
    const isNearTop = y <= edgeThreshold;
    const isNearBottom = y >= rect.height - edgeThreshold;
    const isNearLeft = x <= edgeThreshold;
    const isNearRight = x >= rect.width - edgeThreshold;
    
    if (isNearTop && isNearRight) return 'ne-resize';
    if (isNearTop && isNearLeft) return 'nw-resize';
    if (isNearBottom && isNearRight) return 'se-resize';
    if (isNearBottom && isNearLeft) return 'sw-resize';
    if (isNearTop) return 'n-resize';
    if (isNearBottom) return 's-resize';
    if (isNearLeft) return 'w-resize';
    if (isNearRight) return 'e-resize';
    
    return null;
  };

  // 處理卡片滑鼠移動
  const handleCardMouseMove = useCallback((e, branch) => {
    if (isDragging) return;
    
    const cardElement = e.currentTarget;
    const edgeType = getEdgeType(e, cardElement);
    
    if (edgeType) {
      cardElement.style.cursor = edgeType;
      setHoveredCard(branch.id);
      setCardScales(prev => ({ ...prev, [branch.id]: 1.02 }));
    } else {
      cardElement.style.cursor = 'move';
      setCardScales(prev => ({ ...prev, [branch.id]: 1 }));
    }
  }, [isDragging]);

  // 處理卡片滑鼠離開
  const handleCardMouseLeave = useCallback((branch) => {
    if (!isDragging) {
      setHoveredCard(null);
      setCardScales(prev => ({ ...prev, [branch.id]: 1 }));
    }
  }, [isDragging]);

  // 開始調整大小
  const startResize = (e, branch, edgeType) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = branch.width;
    const startHeight = branch.height;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (edgeType.includes('e')) newWidth = Math.max(150, startWidth + deltaX);
      if (edgeType.includes('w')) newWidth = Math.max(150, startWidth - deltaX);
      if (edgeType.includes('s')) newHeight = Math.max(100, startHeight + deltaY);
      if (edgeType.includes('n')) newHeight = Math.max(100, startHeight - deltaY);
      
      newWidth = Math.min(400, newWidth);
      newHeight = Math.min(300, newHeight);
      
      updateBranch(branch.id, 'width', newWidth);
      updateBranch(branch.id, 'height', newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);
    };
    
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startLongPress = (e, branch) => {
    e.preventDefault();
    e.stopPropagation();
    
    const edgeType = getEdgeType(e, e.currentTarget);
    if (edgeType && !branch.isCollapsed) {
      startResize(e, branch, edgeType);
      return;
    }
    
    if (!branch.isCollapsed) {
      handleDragStart(e, branch);
      return;
    }
    
    setLongPressStarted(true);
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      handleDragStart(e, branch);
    }, 20);
    
    setLongPressTimer(timer);
  };

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    setTimeout(() => {
      setLongPressStarted(false);
      setIsLongPressing(false);
    }, 100);
  };

  const handleDragStart = (e, branch) => {
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    const cardCenterX = (branch.position / 100) * rect.width;
    const cardCenterY = ((50 + branch.verticalOffset) / 100) * rect.height;
    
    setDraggedBranch(branch.id);
    setDragOffset({
      x: relativeX - cardCenterX,
      y: relativeY - cardCenterY
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!draggedBranch || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - dragOffset.x;
    const relativeY = e.clientY - rect.top - dragOffset.y;
    const percentX = Math.max(5, Math.min(95, (relativeX / rect.width) * 100));
    const percentY = Math.max(5, Math.min(95, (relativeY / rect.height) * 100));
    const side = percentY < 50 ? 'top' : 'bottom';
    const verticalOffset = percentY - 50;
    
    setBranches(branches.map(branch => 
      branch.id === draggedBranch ? { 
        ...branch, 
        position: percentX,
        side: side,
        verticalOffset: verticalOffset
      } : branch
    ));
  };

  const handleMouseUp = () => {
    setDraggedBranch(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    clearLongPress();
  };

  const handleNodeClick = (e, branch) => {
    e.stopPropagation();
    
    if (isDragging || isLongPressing || longPressStarted) {
      return;
    }
    
    // 展開單個節點
    setBranches(branches.map(b => 
      b.id === branch.id ? { ...b, isCollapsed: false } : b
    ));
    
    // 更新活動分支
    setActiveBranch(branch.type);
  };

  const handleMouseMoveOnNode = (e) => {
    if (longPressTimer && !isLongPressing) {
      clearLongPress();
    }
  };

  React.useEffect(() => {
    if (draggedBranch) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedBranch, dragOffset, branches, isDragging]);

  React.useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const getButtonStyle = (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    backgroundColor: activeBranch === type ? branchTypes[type].color : branchTypes[type].color,
    color: 'white',
    transform: activeBranch === type ? 'scale(1.05)' : 'scale(1)',
    opacity: activeBranch === type ? 1 : 0.8
  });

  const getCardStyle = (branch) => ({
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: hoveredCard === branch.id ? '0 15px 25px rgba(0, 0, 0, 0.15)' : '0 10px 15px rgba(0, 0, 0, 0.1)',
    width: `${branch.width}px`,
    height: `${branch.height}px`,
    cursor: 'move',
    userSelect: 'none',
    transition: 'all 0.2s ease-out',
    backgroundColor: branchTypes[branch.type]?.bgColor || '#ffffff',
    transform: `scale(${cardScales[branch.id] || 1})`,
    transformOrigin: 'center',
    overflow: 'hidden'
  });

  const containerStyle = {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)',
    padding: '32px'
  };

  const mainContainerStyle = {
    maxWidth: '1792px',
    margin: '0 auto'
  };

  const headerStyle = {
    marginBottom: '32px',
    textAlign: 'center'
  };

  const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px'
  };

  const fishboneContainerStyle = {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
    padding: '32px',
    minHeight: '600px',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle}>
      <div style={mainContainerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={titleStyle}>
            <Stethoscope color="#2563eb" size={32} />
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              病患療程魚骨圖
            </h1>
          </div>
          <p style={{ color: '#6b7280', margin: 0 }}>魚骨圖式療程追蹤系統 - 點擊分支按鈕篩選療程卡 (位置自動儲存)</p>
        </div>

        {/* Branch Filter Buttons */}
        {/* File Import Button */}
<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
  <input
    type="file"
    accept=".json"
    onChange={handleFileImport}
    ref={fileInputRef}
    style={{ display: 'none' }}
  />
  <button
    onClick={() => fileInputRef.current?.click()}
    disabled={isImporting}
    style={{
      padding: '12px 24px',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: isImporting ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}
  >
    {isImporting ? '匯入中...' : '📁 匯入病歷JSON'}
  </button>
</div>

{/* Patient Selection */}
{patientsData.length > 0 && (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
    <select
      value={selectedPatient?.patientId || ''}
      onChange={(e) => {
        const patient = patientsData.find(p => p.patientId === e.target.value);
        setSelectedPatient(patient);
        if (patient?.medicalRecords?.[0]) {
          setSelectedRecord(patient.medicalRecords[0]);
          mapRecordToBranches(patient.medicalRecords[0], patient);
        }
      }}
      style={{ 
        padding: '8px 12px', 
        borderRadius: '6px', 
        border: '1px solid #d1d5db',
        fontSize: '14px'
      }}
    >
      {patientsData.map(patient => (
        <option key={patient.patientId} value={patient.patientId}>
          {patient.patientName} ({patient.patientId})
        </option>
      ))}
    </select>
    
    {selectedPatient?.medicalRecords && (
      <select
        value={selectedRecord?.recordId || selectedPatient.medicalRecords.indexOf(selectedRecord)}
        onChange={(e) => {
          const record = selectedPatient.medicalRecords.find(r => 
            r.recordId === e.target.value || 
            selectedPatient.medicalRecords.indexOf(r) === parseInt(e.target.value)
          );
          setSelectedRecord(record);
          if (record) mapRecordToBranches(record, selectedPatient);
        }}
        style={{ 
          padding: '8px 12px', 
          borderRadius: '6px', 
          border: '1px solid #d1d5db',
          fontSize: '14px'
        }}
      >
        {selectedPatient.medicalRecords.map((record, index) => (
          <option key={record.recordId || index} value={record.recordId || index}>
            {record.visitDate || `記錄 ${index + 1}`}
          </option>
        ))}
      </select>
    )}
  </div>
)}

{/* Branch Filter Buttons */}
<div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {Object.entries(branchTypes).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleBranchClick(type)}
              style={getButtonStyle(type)}
              onMouseEnter={(e) => {
                if (activeBranch !== type) {
                  e.target.style.opacity = '1';
                  e.target.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeBranch !== type) {
                  e.target.style.opacity = '0.8';
                  e.target.style.transform = 'scale(1)';
                }
              }}
            >
              {config.name}
            </button> 
          ))}
        </div>

        {/* Main Fishbone Container */}
        <div style={fishboneContainerStyle} ref={containerRef}>
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
            {/* Main Axis Line */}
            <line
              x1="10%"
              y1="50%"
              x2="90%"
              y2="50%"
              stroke="#374151"
              strokeWidth="4"
              markerEnd="url(#arrowhead)"
            />
            
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#374151"
                />
              </marker>
            </defs>

            {/* Branch Lines */}
            {branches.map(branch => {
              const mainY = 50;
              const branchY = branch.isCollapsed ? 50 : 50 + branch.verticalOffset;
              const branchX = branch.position;
              const branchColor = branchTypes[branch.type]?.color || '#6B7280';
              
              return (
                <g key={branch.id}>
                  {/* 連接線 */}
                  {!branch.isCollapsed && (
                    <line
                      x1={`${branchX}%`}
                      y1={`${mainY}%`}
                      x2={`${branchX}%`}
                      y2={`${branchY}%`}
                      stroke={branchColor}
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Branch endpoint circle */}
                  <circle
                    cx={`${branchX}%`}
                    cy={`${branchY}%`}
                    r={branch.isCollapsed ? "12" : "6"}
                    fill={branch.isCollapsed ? '#ffffff' : branchColor}
                    stroke={branchColor}
                    strokeWidth="2"
                    style={{ 
                      cursor: branch.isCollapsed ? (isLongPressing && draggedBranch === branch.id ? 'move' : 'pointer') : 'default',
                      opacity: draggedBranch === branch.id ? 0.7 : 1
                    }}
                    onMouseDown={(e) => branch.isCollapsed && startLongPress(e, branch)}
                    onMouseUp={clearLongPress}
                    onMouseMove={handleMouseMoveOnNode}
                    onClick={(e) => branch.isCollapsed && handleNodeClick(e, branch)}
                  />
                  
                  {/* 收起狀態下的標題文字 */}
                  {branch.isCollapsed && (
                    <text
                      x={`${branchX}%`}
                      y={`${branchY}%`}
                      dy="25"
                      textAnchor="middle"
                      fontSize="12"
                      fill="#374151"
                      fontWeight="500"
                      style={{ 
                        cursor: isLongPressing && draggedBranch === branch.id ? 'move' : 'pointer',
                        userSelect: 'none',
                        opacity: draggedBranch === branch.id ? 0.7 : 1
                      }}
                      onMouseDown={(e) => startLongPress(e, branch)}
                      onMouseUp={clearLongPress}
                      onMouseMove={handleMouseMoveOnNode}
                      onClick={(e) => handleNodeClick(e, branch)}
                    >
                      {branch.title}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Timeline Labels */}
          <div style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#6b7280',
            zIndex: 2 
          }}>
            
          </div>
          <div style={{ 
            position: 'absolute', 
            right: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#6b7280',
            zIndex: 2 
          }}>
            
          </div>

          {/* Branch Content Cards */}
          {branches.filter(branch => !branch.isCollapsed).map(branch => (
            <div
              key={branch.id}
              style={{
                position: 'absolute',
                left: `${branch.position}%`,
                top: `${50 + branch.verticalOffset}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                zIndex: 3,
                ...getCardStyle(branch),
                opacity: draggedBranch === branch.id ? 0.7 : 1
              }}
              onMouseDown={(e) => startLongPress(e, branch)}
              onMouseUp={clearLongPress}
              onMouseMove={(e) => handleCardMouseMove(e, branch)}
              onMouseLeave={() => handleCardMouseLeave(branch)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: branchTypes[branch.type]?.color || '#3b82f6', 
                      borderRadius: '50%' 
                    }} 
                  />
                  <input
                    type="text"
                    value={branch.title}
                    onChange={(e) => updateBranch(branch.id, 'title', e.target.value)}
                    style={{
                      fontWeight: '600',
                      color: '#1f2937',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'text',
                      width: '120px'
                    }}
                    onFocus={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                    onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  
                </div>
              </div>
              
              <textarea
                value={branch.description}
                onChange={(e) => updateBranch(branch.id, 'description', e.target.value)}
                style={{
                  width: '100%',
                  height: `${branch.height - 80}px`,
                  fontSize: '14px',
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: '4px',
                  borderRadius: '4px',
                  cursor: 'text'
                }}
                placeholder="輸入療程內容..."
                onFocus={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          ))}

          {/* Main Axis Time Points */}
          <div style={{ 
            position: 'absolute', 
            left: '10%', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            zIndex: 2 
          }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#10b981', 
              borderRadius: '50%', 
              border: '2px solid white', 
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' 
            }}></div>
          </div>
          <div style={{ 
            position: 'absolute', 
            left: '90%', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            zIndex: 2 
          }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#ef4444', 
              borderRadius: '50%', 
              border: '2px solid white', 
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' 
            }}></div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
          <p style={{ margin: 0 }}>點擊上方分支按鈕來篩選顯示對應的療程卡</p>
          <p style={{ margin: '4px 0 0 0' }}>
            <strong>單次點擊</strong>收起的節點可展開療程卡，<strong>長按</strong>節點或療程卡可開始拖拽移動
          </p>
          <p style={{ margin: '4px 0 0 0' }}>
            <strong>滑鼠移動到療程卡邊緣</strong>可以調整卡片大小，卡片會自動縮放提供視覺回饋
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#059669' }}>
            <strong>✨ 新功能：</strong>卡片位置會自動儲存，重新載入頁面時會保持上次的位置
          </p>
        </div>
      </div>
    </div>
  );
};

export default FishboneTimeline;

