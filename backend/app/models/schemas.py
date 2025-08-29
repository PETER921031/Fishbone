from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List

class PatientInfo(BaseModel):
    """患者資訊模型"""
    patient_name: str = Field(..., min_length=1, max_length=100, description="患者姓名")
    patient_age: int = Field(..., ge=0, le=120, description="患者年齡")
    cac_score: float = Field(..., ge=0, description="CAC 積分")
    gender: Optional[str] = Field(None, description="性別")
    medical_history: Optional[str] = Field(None, description="病史")
    lifestyle_factors: Optional[str] = Field(None, description="生活型態因素")
    
    @validator('patient_age')
    def validate_age(cls, v):
        if v < 0 or v > 120:
            raise ValueError('年齡必須在 0-120 之間')
        return v
    
    @validator('cac_score')
    def validate_cac_score(cls, v):
        if v < 0:
            raise ValueError('CAC 積分不能為負數')
        return v

class ModelInfo(BaseModel):
    """模型資訊模型"""
    name: str = Field(..., description="模型名稱")
    display_name: str = Field(..., description="顯示名稱")
    description: str = Field(..., description="模型描述")

class ModelsResponse(BaseModel):
    """模型列表回應模型"""
    models: List[ModelInfo] = Field(..., description="可用模型列表")

class EducationRequest(BaseModel):
    """衛教請求模型"""
    patient_info: PatientInfo = Field(..., description="患者資訊")
    content_type: str = Field(..., description="內容類型: risk_assessment, lifestyle, medication")
    model: Optional[str] = Field(None, description="指定的 LLM 模型名稱，如果不指定則使用預設模型")
    language: Optional[str] = Field("zh-TW", description="生成語言，預設為繁體中文")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = ["risk_assessment", "lifestyle", "medication"]
        if v not in allowed_types:
            raise ValueError(f'內容類型必須是以下之一: {", ".join(allowed_types)}')
        return v
    
    @validator('model')
    def validate_model(cls, v):
        if v is not None and v.strip() == "":
            return None  # 空字串視為 None
        return v

class EducationResponse(BaseModel):
    """衛教回應模型"""
    id: int = Field(..., description="記錄ID")
    patient_name: str = Field(..., description="患者姓名")
    cac_score: float = Field(..., description="CAC 積分")
    risk_level: str = Field(..., description="風險等級")
    generated_content: str = Field(..., description="生成的衛教內容")
    created_at: datetime = Field(..., description="建立時間")
    model_used: Optional[str] = Field(None, description="使用的模型名稱")
    
    class Config:
        from_attributes = True  # 允許從 ORM 物件轉換

class PromptTemplateCreate(BaseModel):
    """建立 Prompt 模板請求模型"""
    template_name: str = Field(..., min_length=1, max_length=100, description="模板名稱")
    template_content: str = Field(..., min_length=1, description="模板內容")
    category: str = Field(..., description="分類: risk_assessment, lifestyle, medication")
    
    @validator('category')
    def validate_category(cls, v):
        allowed_categories = ["risk_assessment", "lifestyle", "medication"]
        if v not in allowed_categories:
            raise ValueError(f'分類必須是以下之一: {", ".join(allowed_categories)}')
        return v

class PromptTemplateResponse(BaseModel):
    """Prompt 模板回應模型"""
    id: int = Field(..., description="模板ID")
    template_name: str = Field(..., description="模板名稱")
    template_content: str = Field(..., description="模板內容")
    category: str = Field(..., description="分類")
    created_at: datetime = Field(..., description="建立時間")
    
    class Config:
        from_attributes = True  # 允許從 ORM 物件轉換

class HealthCheckResponse(BaseModel):
    """健康檢查回應模型"""
    status: str = Field(..., description="狀態")
    message: str = Field(..., description="訊息")

class ErrorResponse(BaseModel):
    """錯誤回應模型"""
    detail: str = Field(..., description="錯誤詳情")
    error_code: Optional[str] = Field(None, description="錯誤代碼")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="錯誤時間")
class PatientResponse(BaseModel):
    """病患回應模型"""
    id: str = Field(..., description="病患ID")
    name: str = Field(..., description="病患姓名") 
    age: int = Field(..., description="病患年齡")
    gender: Optional[str] = Field(None, description="性別")
    cac_score: float = Field(..., description="CAC積分")
    medical_history: Optional[str] = Field(None, description="病史")
    lifestyle_factors: Optional[str] = Field(None, description="生活型態")
    patient_data: dict = Field(..., description="完整病患資訊JSON")
    
    class Config:
        from_attributes = True

class PatientEducationRequest(BaseModel):
    """病患衛教請求模型"""
    patient_id: str = Field(..., description="病患ID")
    content_type: str = Field(..., description="內容類型")
    model: Optional[str] = Field(None, description="指定的LLM模型")
    language: Optional[str] = Field("zh-TW", description="生成語言")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = ["risk_assessment", "lifestyle", "medication"]
        if v not in allowed_types:
            raise ValueError(f'內容類型必須是以下之一: {", ".join(allowed_types)}')
        return v