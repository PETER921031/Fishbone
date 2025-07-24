import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Calendar, Stethoscope } from 'lucide-react';

const FishboneTimeline = () => {
  // 固定的分支類型和對應的療程卡
  const branchTypes = {
    diagnosis: { name: '診斷', color: '#3b82f6', bgColor: '#eff6ff' },
    treatment: { name: '治療', color: '#dc2626', bgColor: '#fef2f2' },
    recovery: { name: '復原', color: '#ea580c', bgColor: '#fff7ed' },
    tracking: { name: '追蹤', color: '#16a34a', bgColor: '#f0fdf4' }
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
  const [activeBranch, setActiveBranch] = useState(null); // 當前選中的分支類型
  const [draggedBranch, setDraggedBranch] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressStarted, setLongPressStarted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [cardScales, setCardScales] = useState({});
  const containerRef = useRef(null);
  const [selectedBranches, setSelectedBranches] = useState(new Set(Object.keys(branchTypes)));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  // 處理分支按鈕點擊
  const handleBranchClick = (branchType) => {
  const newSelected = new Set(selectedBranches);
  if (newSelected.has(branchType)) {
    newSelected.delete(branchType);
  } else {
    newSelected.add(branchType);
  }
  setSelectedBranches(newSelected);
  
  // 更新分支顯示狀態
  setBranches(branches.map(branch => ({
    ...branch,
    isCollapsed: !newSelected.has(branch.type)
  })));
};

// 新增全選功能
const handleSelectAll = () => {
  const allBranchTypes = Object.keys(branchTypes);
  const isAllSelected = allBranchTypes.every(type => selectedBranches.has(type));
  
  if (isAllSelected) {
    // 如果全選，則取消全選
    setSelectedBranches(new Set());
    setBranches(branches.map(branch => ({ ...branch, isCollapsed: true })));
  } else {
    // 否則全選
    setSelectedBranches(new Set(allBranchTypes));
    setBranches(branches.map(branch => ({ ...branch, isCollapsed: false })));
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
  // 點擊外部關閉下拉選單
React.useEffect(() => {
  const handleClickOutside = (event) => {
    if (containerRef.current && !event.target.closest('[data-dropdown]')) {
      setIsDropdownOpen(false);
    }
  };

  if (isDropdownOpen) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [isDropdownOpen]);

  const getButtonStyle = (type, isSelected) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 20px',
  borderRadius: '8px',
  border: isSelected ? `2px solid ${branchTypes[type].color}` : '2px solid #e5e7eb',
  fontSize: '16px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: isSelected ? branchTypes[type].bgColor : '#ffffff',
  color: isSelected ? branchTypes[type].color : '#6b7280',
  boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
});

// 全選按鈕樣式
const getSelectAllStyle = (isAllSelected) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 20px',
  borderRadius: '8px',
  border: isAllSelected ? '2px solid #3b82f6' : '2px solid #e5e7eb',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: isAllSelected ? '#eff6ff' : '#ffffff',
  color: isAllSelected ? '#3b82f6' : '#6b7280',
  boxShadow: isAllSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
  marginRight: '8px'
});

// 勾選框樣式
const getCheckboxStyle = (isSelected, color) => ({
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  border: isSelected ? `2px solid ${color}` : '2px solid #d1d5db',
  backgroundColor: isSelected ? color : '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
});

  const getCardStyle = (branch) => {
  const gradientStyles = {
    diagnosis: 'linear-gradient(to right, #ffffffff, #ffdfdfff)',
    treatment: 'linear-gradient(to right, #ffffffff, #fbf7cfff)',
    recovery: 'linear-gradient(to right, #ffffffff, #dcecffff)',
    tracking: 'linear-gradient(to right, #ffffffff, #eedffdff)'
  };
  
  const borderStyles = {
    diagnosis: '1px solid #fecaca',
    treatment: '1px solid #fbcfe8',
    recovery: '1px solid #bfdbfe',
    tracking: '1px solid #e9d5ff'
  };

  return {
  background: gradientStyles[branch.type] || gradientStyles.diagnosis,
  border: borderStyles[branch.type] || borderStyles.diagnosis,
  borderRadius: '8px',
  padding: '16px',
  boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
  width: `${branch.width}px`,
  height: `${branch.height}px`,
  cursor: 'default',
  userSelect: 'none',
  transition: 'all 0.2s ease-out',
  overflow: 'hidden'
};
};

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
          <p style={{ color: '#6b7280', margin: 0 }}>魚骨圖式療程追蹤系統 - 點擊分支按鈕篩選療程卡 </p>
        </div>

        

        {/* Main Fishbone Container */}
<div style={fishboneContainerStyle} ref={containerRef}>
  {/* 下拉式篩選器 */}
  <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
    <div style={{ position: 'relative' }} data-dropdown>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          minWidth: '160px',
          justifyContent: 'space-between'
        }}
      >
        <span>療程追蹤篩選</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none"
          style={{ 
            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <path d="M4 6L8 10L12 6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          marginTop: '4px',
          padding: '8px',
          zIndex: 20
        }}>
          {/* 全選選項 */}
          <div
            onClick={handleSelectAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <div style={getCheckboxStyle(selectedBranches.size === Object.keys(branchTypes).length, '#3b82f6')}>
              {selectedBranches.size === Object.keys(branchTypes).length && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span>Select All</span>
          </div>
          
          {/* 分隔線 */}
          <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>
          
          {/* 各分支選項 */}
          {Object.entries(branchTypes).map(([type, config]) => {
            const isSelected = selectedBranches.has(type);
            return (
              <div
                key={type}
                onClick={() => handleBranchClick(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <div style={getCheckboxStyle(isSelected, config.color)}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span>{config.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
 
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
  
  return (
    <g key={branch.id}>
      {/* 連接線 */}
      {!branch.isCollapsed && (
        <line
          x1={`${branchX}%`}
          y1={`${mainY}%`}
          x2={`${branchX}%`}
          y2={`${branchY}%`}
          stroke="#9ca3af"
          strokeWidth="2"
        />
      )}
      
      {/* Branch endpoint circle */}
      <circle
        cx={`${branchX}%`}
        cy={`${branchY}%`}
        r={branch.isCollapsed ? "12" : "6"}
        fill={branch.isCollapsed ? '#ffffff' : '#9ca3af'}
        stroke="#9ca3af"
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
      ...getCardStyle(branch)
    }}
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
          <p style={{ margin: 0 }}>點擊療程追蹤篩選</p>
          <p style={{ margin: '4px 0 0 0' }}>
            <strong></strong>
          </p>
          <p style={{ margin: '4px 0 0 0' }}>
            <strong>滑鼠移動到療程卡邊緣</strong>可以調整卡片大小，卡片會自動縮放提供視覺回饋
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#059669' }}>
            <strong></strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FishboneTimeline;
