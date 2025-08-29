-- CAC 衛教單生成器資料庫初始化
-- 建立資料庫
CREATE DATABASE cac_education;

-- 使用資料庫
\c cac_education;

-- 建立衛教記錄表
CREATE TABLE health_education_records (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    patient_age INTEGER NOT NULL CHECK (patient_age >= 0 AND patient_age <= 120),
    cac_score FLOAT NOT NULL CHECK (cac_score >= 0),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('Low', 'High' )),
    generated_content TEXT NOT NULL,
    prompt_used TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立 Prompt 模板表
CREATE TABLE prompt_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('risk_assessment', 'lifestyle', 'medication')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提高查詢效能
CREATE INDEX idx_health_records_created_at ON health_education_records(created_at DESC);
CREATE INDEX idx_health_records_patient_name ON health_education_records(patient_name);
CREATE INDEX idx_health_records_risk_level ON health_education_records(risk_level);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);

-- 插入預設的 Prompt 模板
INSERT INTO prompt_templates (template_name, template_content, category) VALUES
(
    '風險評估標準模板',
    '你是一位專業的心臟科醫師，請為患者提供CAC風險評估衛教。患者資訊：姓名{patient_name}，年齡{patient_age}歲，CAC積分{cac_score}。請包含：1.CAC解釋 2.風險等級說明 3.建議追蹤',
    'risk_assessment'
),
(
    '生活型態建議標準模板', 
    '請為CAC積分{cac_score}的患者提供生活型態改善建議。包含：1.飲食建議 2.運動指導 3.生活習慣調整 4.定期監測項目',
    'lifestyle'
),
(
    '藥物治療衛教標準模板',
    '根據CAC積分{cac_score}和風險等級，說明藥物治療方針。包含：1.是否需要用藥 2.常用藥物介紹 3.注意事項 4.定期追蹤',
    'medication'
);

-- 建立觸發器自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_health_education_records_updated_at 
    BEFORE UPDATE ON health_education_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at 
    BEFORE UPDATE ON prompt_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 建立視圖方便查詢統計資料
CREATE VIEW cac_statistics AS
SELECT 
    risk_level,
    COUNT(*) as record_count,
    AVG(cac_score) as avg_cac_score,
    MIN(cac_score) as min_cac_score,
    MAX(cac_score) as max_cac_score
FROM health_education_records 
GROUP BY risk_level
ORDER BY 
    CASE risk_level
        WHEN 'Low' THEN 1
        WHEN 'High' THEN 2
    END;