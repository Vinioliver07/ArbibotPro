# Python Example: Reading Entities
# Filterable fields: token_pair, dex_buy, dex_sell, price_buy, price_sell, spread_percentage, potential_profit, loan_amount, gas_cost, net_profit, status, execution_window, confidence_score
import requests

def make_api_request(api_path, method='GET', data=None):
    url = f'https://app.base44.com/api/{api_path}'
    headers = {
        'api_key': 'eb2f4ef2fd514f868dd8161d5cb16192',
        'Content-Type': 'application/json'
    }
    if method.upper() == 'GET':
        response = requests.request(method, url, headers=headers, params=data)
    else:
        response = requests.request(method, url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

entities = make_api_request(f'apps/68597fa25ab57f03a564a78b/entities/ArbitrageOpportunity')
print(entities)

# Python Example: Updating an Entity
# Filterable fields: token_pair, dex_buy, dex_sell, price_buy, price_sell, spread_percentage, potential_profit, loan_amount, gas_cost, net_profit, status, execution_window, confidence_score
def update_entity(entity_id, update_data):
    response = requests.put(
        f'https://app.base44.com/api/apps/68597fa25ab57f03a564a78b/entities/ArbitrageOpportunity/{entity_id}',
        headers={
            'api_key': 'eb2f4ef2fd514f868dd8161d5cb16192',
            'Content-Type': 'application/json'
        },
        json=update_data
    )
    response.raise_for_status()
    return response.json()