# Admira — Reto

## 📡 Fuente / API elegida y endpoints
- **Fuente:** [CoinGecko API](https://www.coingecko.com/en/api)  
- **Endpoint principal:**  
`/coins/{coin}/market_chart?vs_currency={vs}&days={days}&interval=daily`

- **Endpoint local de respaldo:**  
`/api/mock`

---

## 🚀 Cómo correr
```bash
npm install
npm run dev
```
La aplicación se inicia en [http://localhost:3000](http://localhost:3000).

---

## 🔐 Variables de entorno utilizadas
```env
WEBHOOK_URL=<url de webhook>
COINGECKO_BASE=https://api.coingecko.com/api/v3
DEFAULT_VS_CURRENCY=usd
```

---

## 🧮 Transformaciones implementadas

1. **Agregación temporal diaria (`toDaily`)**  
   Normaliza los timestamps a un único valor por día.

2. **% de cambio diario (`withPctChange`)**  
   Fórmula:  
   ```
   pctChange_i = ((value_i - value_{i-1}) / value_{i-1}) * 100
   ```

3. **Media móvil de 7 días (`withSMA`)**  
   Promedio móvil simple con ventana de 7 puntos.

---

## ⚖️ Decisiones de diseño y trade-offs

- Todas las llamadas pasan por `/api/proxy` para:  
  - Centralizar requests,  
  - Registrar trazas en `server/logs/http_trace.jsonl`,  
  - Enviar datos al `WEBHOOK_URL`.  

- Se incluyó `/api/mock` como fallback frente a errores o límites de CoinGecko.  

- Se eligió **Recharts** para tener gráficos de línea, barra y pie en un mismo stack.

---

## 🤖 Declaración de uso de IA
Se usó IA únicamente para:  
- Investigación de la API de CoinGecko.  
- Apoyo en la creación de datos falsos del endpoint `/api/mock`.  
- Apoyo en la redacción del archivo `README.md`.  
