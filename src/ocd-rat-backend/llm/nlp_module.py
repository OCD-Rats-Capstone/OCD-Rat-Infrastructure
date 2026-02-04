import os

class NLPModule:

    def __init__(self):
        self.LLM_API_KEY = os.getenv("LLM_API_KEY")
        self.System_Prompt = os.getenv("System_Prompt", "")
        self.Schema_Attributes = os.getenv("Schema_Attributes","")
        self.Valid_Operators = os.getenv("Valid_Operators","")

    # Exported Access Program
    def NLP_Processor(self, natural_language: str) -> str:

        if natural_language is None or natural_language == "":
            raise Exception("empty input")
        
        llm_response = self.LLM_API_CALL(natural_language, self.System_Prompt)

        if self.is_valid_output(llm_response):
            return llm_response
        
        raise Exception("incoherent prompt")


    # Local Functions
    def is_valid_output(self, LLM_Response: str) -> bool:
        #? MIS does not specify the format of the LLM output.
        #? An assumption was made here that the data is separated by commas.
        attributes = self.Schema_Attributes.split(",")
        operators = self.Valid_Operators.split(",")
        
        hasAttributes = False
        for a in attributes:
            if a in LLM_Response:
                hasAttributes = True
                break

        hasOperators = False
        for o in operators:
            if o in LLM_Response:
                hasOperators = True
                break

        #? MIS does not specify how <Value> is detected
        hasValue = "<Value>" in LLM_Response

        if hasAttributes and hasOperators and hasValue:
            return True

        return False

    def LLM_API_CALL(self, natural_language: str, System_Prompt: str) -> str:
        
        #? MIS does not specify implementation details for calling the LLM API
        #? Returning an empty string, MIS specifies this functionr returns 'LLM_Response'
        return ""