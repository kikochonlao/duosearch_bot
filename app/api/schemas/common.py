from pydantic import BaseModel


class SuccessResponse(BaseModel):
    ok: bool = True
