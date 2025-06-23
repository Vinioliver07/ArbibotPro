{
    "name": "MonitoringConfig",
    "type": "object",
    "properties": {
      "token_symbol": {
        "type": "string",
        "description": "Símbolo do token (ETH, BTC, etc)"
      },
      "token_address": {
        "type": "string",
        "description": "Endereço do contrato do token"
      },
      "min_spread":{
        "type": "number",
        "description": "Spread mínimo para alertar (%)",
        "default": 0.5
      },
      "min_profit": {
        "type": "number",
        "description": "Lucro mínimo em USD",
        "default": 50
      },
      "max_loan_amount": {
        "type": "number",
        "description": "Valor máximo de flash loan",
        "default": 100000
      },
      "enabled_dexs": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "DEXs habilitadas para monitoramento"
      },
      "is_active": {
        "type": "boolean",
        "default": true
      }
    },
    "required": [
      "token_symbol"
    ]
  }