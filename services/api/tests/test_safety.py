from app.services.safety import evaluate_safety

def test_chest_discomfort_blocks():
    decision = evaluate_safety({"energy": 4, "pain": 0, "chest_discomfort": True})
    assert decision["action"] == "BLOCK_AND_SHOW_SAFETY_MESSAGE"
    assert "not an emergency service" in decision["explanation"]
