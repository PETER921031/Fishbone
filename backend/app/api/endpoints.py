from sqlalchemy import func  # ← 統計查詢需要用 sqlalchemy.func，不要用 db.func
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
from pathlib import Path

# ✅ 簡化 import 邏輯
try:
    from app.models.database import get_db, HealthEducationRecord, PromptTemplate, Patient  # 添加 Patient 導入
    from app.models.schemas import (
        EducationRequest, EducationResponse, PromptTemplateCreate, PromptTemplateResponse,
        PatientResponse, PatientEducationRequest  # 添加缺少的 schema 導入
    )
    from app.services.ollama_service import ollama_service
    from app.services.prompt_service import cac_prompt_service
    print("✅ 模組導入成功")
except ImportError as e:
    print(f"❌ 模組導入失敗: {e}")
    print(f"當前檔案位置: {__file__}")
    print(f"Python 路徑: {sys.path}")
    
    # 嘗試添加路徑
    current_file = Path(__file__).resolve()
    backend_dir = current_file.parents[2]  # 從 app/api/endpoints.py 往上兩層
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
        print(f"已添加路徑: {backend_dir}")
    
    # 重新嘗試導入
    try:
        from app.models.database import get_db, HealthEducationRecord, PromptTemplate, Patient
        from app.models.schemas import (
            EducationRequest, EducationResponse, PromptTemplateCreate, PromptTemplateResponse,
            PatientResponse, PatientEducationRequest
        )
        from app.services.ollama_service import ollama_service
        from app.services.prompt_service import cac_prompt_service
        print("✅ 路徑修正後導入成功")
    except ImportError as e2:
        print(f"❌ 最終導入失敗: {e2}")
        raise ImportError("無法載入必要模組，請檢查檔案結構")

router = APIRouter()


# 新增這些路由
@router.get("/patients", response_model=List[PatientResponse])
async def get_patients(db: Session = Depends(get_db)):
    """獲取所有病患列表"""
    patients = db.query(Patient).all()
    return patients

@router.get("/patients/{patient_id}", response_model=PatientResponse)  
async def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """獲取特定病患資訊"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="病患不存在")
    return patient

@router.post("/patients/{patient_id}/education", response_model=EducationResponse)
async def generate_patient_education(
    patient_id: str,
    request: PatientEducationRequest,
    db: Session = Depends(get_db)
):
    """為特定病患生成衛教內容"""
    # 獲取病患資訊
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="病患不存在")
    
    # 解析病患JSON資料
    import json
    try:
        patient_data = json.loads(patient.patient_data)
    except (json.JSONDecodeError, TypeError):
        # 如果 patient_data 已經是字典，直接使用
        patient_data = patient.patient_data if isinstance(patient.patient_data, dict) else {}
    
    # 構建 PatientInfo 對象
    from app.models.schemas import PatientInfo
    patient_info = PatientInfo(
        patient_name=patient.name,
        patient_age=patient.age,
        cac_score=patient.cac_score,
        gender=patient.gender,
        medical_history=patient.medical_history,
        lifestyle_factors=patient.lifestyle_factors
    )
    
    # 構建 EducationRequest 對象
    education_request = EducationRequest(
        patient_info=patient_info,
        content_type=request.content_type,
        model=request.model,
        language=request.language
    )
    
    # 使用現有的生成邏輯
    return await generate_health_education(education_request, db)

@router.get("/models")
async def get_available_models():
    """取得可用的模型列表"""
    try:
        print("🔍 正在獲取可用模型列表...")
        models = await ollama_service.get_available_models()
        print(f"✅ 成功獲取 {len(models)} 個模型")
        return {"models": models}
    except Exception as e:
        print(f"❌ 取得模型列表失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"取得模型列表時發生錯誤: {str(e)}")

@router.post("/health-check/ollama")
async def check_ollama_health():
    """檢查 Ollama 服務狀態"""
    try:
        is_healthy = await ollama_service.health_check()
        if not is_healthy:
            raise HTTPException(status_code=503, detail="Ollama 服務無法連接")
        return {"status": "healthy", "message": "Ollama 服務運行正常"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama 健康檢查失敗: {str(e)}")

@router.post("/generate-education", response_model=EducationResponse)
async def generate_health_education(
    request: EducationRequest,
    db: Session = Depends(get_db)
):
    """生成 CAC 衛教資料"""
    try:
        print(f"🔍 收到生成請求")
        print(f"🔧 指定模型: {request.model}")
        print(f"👤 患者: {request.patient_info.patient_name}")
        print(f"📊 CAC分數: {request.patient_info.cac_score}")
        print(f"📋 內容類型: {request.content_type}")
        
        # 🔧 優化模型選擇邏輯
        selected_model = None
        if request.model and request.model.strip():  # 檢查不是空字串
            selected_model = request.model.strip()
            print(f"✅ 使用指定模型: {selected_model}")
            
            # 🔧 驗證模型是否可用
            is_available = await ollama_service.check_model_availability(selected_model)
            if not is_available:
                print(f"⚠️ 警告：指定的模型 {selected_model} 不可用，將使用預設模型")
                selected_model = None
        else:
            print(f"📋 使用預設模型: {ollama_service.default_model}")
        
        # 準備患者資訊
        patient_info = {
            "patient_name": request.patient_info.patient_name,
            "patient_age": request.patient_info.patient_age,
            "cac_score": request.patient_info.cac_score,
            "gender": request.patient_info.gender,
            "medical_history": request.patient_info.medical_history,
            "lifestyle_factors": request.patient_info.lifestyle_factors
        }
        
        # 根據內容類型選擇相應的 prompt
        if request.content_type == "risk_assessment":
            prompt = cac_prompt_service.create_risk_assessment_prompt(patient_info)
            print("📋 生成風險評估 prompt")
        elif request.content_type == "lifestyle":
            prompt = cac_prompt_service.create_lifestyle_prompt(patient_info)
            print("📋 生成生活型態 prompt")
        elif request.content_type == "medication":
            prompt = cac_prompt_service.create_medication_prompt(patient_info)
            print("📋 生成藥物治療 prompt")
        else:
            raise HTTPException(status_code=400, detail="無效的內容類型")
        
        # 🔧 使用指定的模型生成內容，加強錯誤處理
        print(f"🚀 開始生成內容，使用模型: {selected_model or ollama_service.default_model}")
        try:
            generated_content = await ollama_service.generate_response(
                prompt, 
                model=selected_model,
                # 🔧 可選：調整生成參數
                temperature=0.7,
                max_tokens=2000
            )
            print(f"✅ 內容生成完成，長度: {len(generated_content)} 字符")
        except Exception as ollama_error:
            print(f"❌ Ollama 生成失敗: {ollama_error}")
            # 🔧 如果指定模型失敗，嘗試使用預設模型
            if selected_model and selected_model != ollama_service.default_model:
                print(f"🔄 嘗試使用預設模型重新生成...")
                try:
                    generated_content = await ollama_service.generate_response(prompt, model=None)
                    selected_model = ollama_service.default_model  # 更新實際使用的模型
                    print(f"✅ 使用預設模型生成成功")
                except Exception as fallback_error:
                    print(f"❌ 預設模型也失敗: {fallback_error}")
                    raise HTTPException(status_code=500, detail=f"模型生成失敗: {str(fallback_error)}")
            else:
                raise HTTPException(status_code=500, detail=f"內容生成失敗: {str(ollama_error)}")
        
        # 判定風險等級
        risk_level = cac_prompt_service.determine_risk_level(request.patient_info.cac_score)
        print(f"📊 風險等級: {risk_level}")
        
        # 🔧 儲存到資料庫，記錄實際使用的模型
        final_model = selected_model or ollama_service.default_model
        db_record = HealthEducationRecord(
            patient_name=request.patient_info.patient_name,
            patient_age=request.patient_info.patient_age,
            cac_score=request.patient_info.cac_score,
            risk_level=risk_level,
            generated_content=generated_content,
            prompt_used=prompt,
            model_used=final_model  # 記錄實際使用的模型
        )
        
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        print(f"💾 記錄已保存，ID: {db_record.id}")
        print(f"🎯 實際使用模型: {final_model}")
        
        return EducationResponse(
            id=db_record.id,
            patient_name=db_record.patient_name,
            cac_score=db_record.cac_score,
            risk_level=db_record.risk_level,
            generated_content=db_record.generated_content,
            created_at=db_record.created_at,
            model_used=db_record.model_used  # 返回實際使用的模型
        )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ 生成過程發生未預期錯誤: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成衛教資料時發生錯誤: {str(e)}")

@router.get("/education-records", response_model=List[EducationResponse])
async def get_education_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """取得衛教記錄列表"""
    try:
        records = db.query(HealthEducationRecord)\
                   .order_by(HealthEducationRecord.created_at.desc())\
                   .offset(skip).limit(limit).all()
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢記錄時發生錯誤: {str(e)}")

@router.get("/education-records/{record_id}", response_model=EducationResponse)
async def get_education_record(record_id: int, db: Session = Depends(get_db)):
    """取得特定衛教記錄"""
    try:
        record = db.query(HealthEducationRecord).filter(HealthEducationRecord.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="記錄不存在")
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢記錄時發生錯誤: {str(e)}")

@router.post("/prompt-templates", response_model=PromptTemplateResponse)
async def create_prompt_template(
    template: PromptTemplateCreate,
    db: Session = Depends(get_db)
):
    """建立新的 Prompt 模板"""
    try:
        db_template = PromptTemplate(
            template_name=template.template_name,
            template_content=template.template_content,
            category=template.category
        )
        
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        
        return db_template
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"建立模板時發生錯誤: {str(e)}")

@router.get("/prompt-templates", response_model=List[PromptTemplateResponse])
async def get_prompt_templates(
    category: str = None,
    db: Session = Depends(get_db)
):
    """取得 Prompt 模板列表"""
    try:
        query = db.query(PromptTemplate)
        if category:
            query = query.filter(PromptTemplate.category == category)
        
        templates = query.all()
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢模板時發生錯誤: {str(e)}")

@router.delete("/education-records/{record_id}")
async def delete_education_record(record_id: int, db: Session = Depends(get_db)):
    """刪除衛教記錄"""
    try:
        record = db.query(HealthEducationRecord).filter(HealthEducationRecord.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="記錄不存在")
        
        db.delete(record)
        db.commit()
        
        return {"message": f"記錄 {record_id} 已成功刪除"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"刪除記錄時發生錯誤: {str(e)}")

@router.get("/statistics")
def get_statistics(db: Session = Depends(get_db)):
    """
    回傳統計資訊：
    - total_records：衛教記錄總數
    - total_templates：模板總數
    - risk_level_distribution：各風險等級筆數（字典）
    - model_usage：各模型使用次數（新增）
    """
    try:
        # ✅ 總筆數
        total_records = db.query(func.count(HealthEducationRecord.id)).scalar() or 0

        # ✅ 風險等級分佈
        rows = (
            db.query(
                HealthEducationRecord.risk_level,
                func.count(HealthEducationRecord.id).label("count")
            )
            .group_by(HealthEducationRecord.risk_level)
            .all()
        )
        risk_stats = {(level or "Unknown"): int(count) for level, count in rows}

        # ✅ 模板總數
        total_templates = db.query(func.count(PromptTemplate.id)).scalar() or 0
        
        # 🔧 新增：各模型使用統計
        model_rows = (
            db.query(
                HealthEducationRecord.model_used,
                func.count(HealthEducationRecord.id).label("count")
            )
            .group_by(HealthEducationRecord.model_used)
            .all()
        )
        model_stats = {(model or "Unknown"): int(count) for model, count in model_rows}

        return {
            "total_records": int(total_records),
            "risk_level_distribution": risk_stats,
            "total_templates": int(total_templates),
            "model_usage": model_stats,  # 新增模型使用統計
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取得統計資訊時發生錯誤: {str(e)}")

# 🔧 新增：測試模型切換的端點
@router.post("/test-model/{model_name}")
async def test_model(model_name: str):
    """測試指定模型是否可用"""
    try:
        print(f"🧪 測試模型: {model_name}")
        
        # 檢查模型是否可用
        is_available = await ollama_service.check_model_availability(model_name)
        if not is_available:
            return {
                "model": model_name,
                "available": False,
                "message": f"模型 {model_name} 不可用或未安裝"
            }
        
        # 測試簡單生成
        test_prompt = "請用繁體中文回答：什麼是人工智慧？請簡短回答。"
        response = await ollama_service.generate_response(test_prompt, model=model_name)
        
        return {
            "model": model_name,
            "available": True,
            "test_response": response[:200] + "..." if len(response) > 200 else response,
            "message": f"模型 {model_name} 測試成功"
        }
        
    except Exception as e:
        print(f"❌ 模型測試失敗: {str(e)}")
        return {
            "model": model_name,
            "available": False,
            "error": str(e),
            "message": f"模型 {model_name} 測試失敗"
        }
