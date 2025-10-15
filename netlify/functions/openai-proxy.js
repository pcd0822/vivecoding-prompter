/**
 * Netlify 서버리스 함수: OpenAI API 프록시
 *
 * 이 함수는 클라이언트(브라우저) 대신 OpenAI API를 안전하게 호출하는 역할을 합니다.
 * 클라이언트에서 직접 API 키를 사용하면 키가 노출될 위험이 있으므로,
 * 서버 측(Netlify 함수)에서 환경 변수로 등록된 API 키를 사용하여 요청을 중계합니다.
 *
 * 사용 방법:
 * 1. 이 파일을 프로젝트의 `netlify/functions/` 디렉토리에 저장합니다.
 * 2. Netlify 대시보드 > Site settings > Build & deploy > Environment > Environment variables 에서
 * 'OPENAI_API_KEY' 라는 이름으로 자신의 OpenAI API 키를 값으로 등록합니다.
 * 3. 클라이언트 측 JavaScript 코드에서는 `fetch` 요청을
 * 'https://api.openai.com/v1/chat/completions' 대신 '/.netlify/functions/openai-proxy'로 보냅니다.
 */

exports.handler = async function(event, context) {
    // POST 요청만 허용합니다.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 클라이언트에서 보낸 요청 본문을 파싱합니다.
        const requestBody = JSON.parse(event.body);

        // Netlify 환경 변수에서 OpenAI API 키를 가져옵니다.
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            // API 키가 설정되지 않은 경우 오류를 반환합니다.
            throw new Error('OpenAI API key is not set in Netlify environment variables.');
        }

        // OpenAI API에 요청을 보냅니다.
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 환경 변수에서 가져온 API 키를 사용하여 인증 헤더를 설정합니다.
                'Authorization': `Bearer ${apiKey}`
            },
            // 클라이언트에서 받은 요청 본문을 그대로 전달합니다.
            body: JSON.stringify(requestBody)
        });

        // OpenAI API로부터 받은 응답이 정상이 아닌 경우
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('OpenAI API Error:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `OpenAI API request failed: ${response.statusText}`, details: errorBody })
            };
        }

        // OpenAI API 응답 데이터를 가져옵니다.
        const data = await response.json();

        // 성공적인 응답을 클라이언트에 다시 전달합니다.
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        // 함수 실행 중 오류가 발생한 경우
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
