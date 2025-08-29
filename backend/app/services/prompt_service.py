from typing import Dict, Any

class CACPromptService:
    """
    冠狀動脈鈣化 (CAC) 衛教單 Prompt Engineering 服務
    """
    
    @staticmethod
    def determine_risk_level(cac_score: float) -> str:
        """
        根據 CAC 積分判定風險等級
        """
        if cac_score <100:
            return "Low"
        else: 
            return "High"
        
    
    @staticmethod
    def get_base_system_prompt() -> str:
        """
        基礎系統提示詞
        """
        return """你是一位專業的心臟科醫師和衛教專家，專門為患者提供冠狀動脈鈣化(CAC)相關的衛教資訊。

請遵循以下原則：
1. 使用易懂的語言，避免過多醫學術語
2. 提供準確、實證的醫學資訊
3. 內容要有教育性和實用性
4. 保持專業但親切的語調
5. 根據患者的具體情況個人化建議
6. 強調與醫師討論的重要性

回應格式要求：
- 使用條列式或分段落呈現
- 重點資訊用粗體標示
- 包含具體的行動建議"""

    @staticmethod
    def create_risk_assessment_prompt(patient_info: Dict[str, Any]) -> str:
        """
        建立風險評估衛教提示詞
        """
        risk_level = CACPromptService.determine_risk_level(patient_info["cac_score"])
        
        prompt = f"""{CACPromptService.get_base_system_prompt()}

患者資訊：
- 姓名：{patient_info["patient_name"]}
- 年齡：{patient_info["patient_age"]} 歲
- 性別：{patient_info.get("gender", "未提供")}
- CAC 積分：{patient_info["cac_score"]}
- 風險等級：{risk_level}
- 病史：{patient_info.get("medical_history", "無特殊病史")}

請為此患者生成一份關於【冠狀動脈鈣化風險評估】的衛教資料，內容應包括：

1. **什麼是冠狀動脈鈣化**
   - 簡單說明 CAC 的定義
   - 為什麼會發生鈣化

2. **您的檢查結果說明**
   - 解釋患者的 CAC 積分 ({patient_info["cac_score"]})
   - 說明這個分數代表的意義
   - 與同年齡層的比較

3. **心血管疾病風險評估**
   - 根據 CAC 積分評估未來心血管事件風險
   - 風險等級的具體含義

4. **後續建議**
   - 是否需要進一步檢查
   - 多久需要追蹤
   - 何時應該就醫

請以繁體中文回應，內容要專業但易懂。"""

        return prompt
    
    @staticmethod
    def create_lifestyle_prompt(patient_info: Dict[str, Any]) -> str:
        """
        建立生活型態衛教提示詞
        """
        risk_level = CACPromptService.determine_risk_level(patient_info["cac_score"])
        
        prompt = f"""{CACPromptService.get_base_system_prompt()}

患者資訊：
- 姓名：{patient_info["patient_name"]}
- 年齡：{patient_info["patient_age"]} 歲
- 性別：{patient_info.get("gender", "未提供")}
- CAC 積分：{patient_info["cac_score"]}
- 風險等級：{risk_level}
- 生活型態：{patient_info.get("lifestyle_factors", "未提供詳細資訊")}

請為此患者生成一份【生活型態改善建議】的衛教資料，內容應包括：

1. **飲食建議**
   - 有益心血管健康的食物
   - 應該避免的食物
   - 具體的飲食原則和建議

2. **運動建議**
   - 適合的運動類型
   - 運動強度和頻率
   - 運動時的注意事項

3. **生活習慣調整**
   - 戒菸戒酒的重要性
   - 壓力管理
   - 睡眠品質改善

4. **體重管理**
   - 理想體重範圍
   - 減重策略（如適用）

5. **定期監測**
   - 需要定期追蹤的項目
   - 自我監測方法

請根據患者的風險等級提供個人化建議，並以繁體中文回應。"""

        return prompt
    
    @staticmethod
    def create_medication_prompt(patient_info: Dict[str, Any]) -> str:
        """
        建立藥物治療衛教提示詞
        """
        risk_level = CACPromptService.determine_risk_level(patient_info["cac_score"])
        
        prompt = f"""{CACPromptService.get_base_system_prompt()}

患者資訊：
- 姓名：{patient_info["patient_name"]}
- 年齡：{patient_info["patient_age"]} 歲
- CAC 積分：{patient_info["cac_score"]}
- 風險等級：{risk_level}
- 病史：{patient_info.get("medical_history", "無特殊病史")}

請為此患者生成一份【藥物治療衛教】資料，內容應包括：

1. **是否需要藥物治療**
   - 根據風險等級說明藥物治療的必要性
   - 何時開始考慮藥物治療

2. **常見治療藥物介紹**
   - Statin 類藥物（降膽固醇）
   - 抗血小板藥物
   - 血壓控制藥物
   - 血糖控制藥物（如適用）

3. **藥物使用注意事項**
   - 服藥時間和方法
   - 可能的副作用
   - 定期檢驗項目

4. **藥物與生活型態的配合**
   - 服藥期間的飲食注意
   - 與其他藥物的交互作用

5. **重要提醒**
   - 不可自行停藥
   - 定期回診的重要性
   - 與醫師討論調整用藥

**重要聲明**：此資訊僅供衛教參考，實際用藥需經由醫師評估開立，請勿自行購買或使用藥物。

請以繁體中文回應，內容要專業準確。"""

        return prompt

# 建立全域實例
cac_prompt_service = CACPromptService()