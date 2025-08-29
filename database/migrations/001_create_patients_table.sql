\encoding UTF8
SET client_encoding TO 'UTF8';
-- 建立病患表
CREATE TABLE patients (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 120),
    gender VARCHAR(10),
    cac_score FLOAT NOT NULL CHECK (cac_score >= 0),
    medical_history TEXT,
    lifestyle_factors TEXT,
    patient_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入模擬病患資料
INSERT INTO patients (id, name, age, gender, cac_score, medical_history, lifestyle_factors, patient_data) VALUES
(
    'P001',
    '張三',
    45,
    '男',
    85.5,
    '高血壓病史5年，目前服用降壓藥控制良好',
    '抽菸史20年已戒菸2年，偶爾飲酒，缺乏規律運動',
    '{"patient_name": "張三", "patient_age": 45, "gender": "男", "cac_score": 85.5, "medical_history": "高血壓病史5年，目前服用降壓藥控制良好", "lifestyle_factors": "抽菸史20年已戒菸2年，偶爾飲酒，缺乏規律運動", "additional_info": {"blood_pressure": "140/90 mmHg", "cholesterol": "220 mg/dL", "diabetes": false}}'::jsonb
),
(
    'P002', 
    '李四',
    58,
    '女',
    245.8,
    '糖尿病史8年，高血脂症，曾有心絞痛症狀',
    '不抽菸不飲酒，但工作壓力大，飲食不規律，少運動',
    '{"patient_name": "李四", "patient_age": 58, "gender": "女", "cac_score": 245.8, "medical_history": "糖尿病史8年，高血脂症，曾有心絞痛症狀", "lifestyle_factors": "不抽菸不飲酒，但工作壓力大，飲食不規律，少運動", "additional_info": {"blood_pressure": "155/95 mmHg", "cholesterol": "280 mg/dL", "diabetes": true, "hba1c": "8.2%"}}'::jsonb
);

-- 建立索引
CREATE INDEX idx_patients_cac_score ON patients(cac_score);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- 修改現有的health_education_records表，增加patient_id欄位
ALTER TABLE health_education_records ADD COLUMN patient_id VARCHAR(10);
ALTER TABLE health_education_records ADD COLUMN content_type VARCHAR(50);
ALTER TABLE health_education_records ADD CONSTRAINT fk_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id);
