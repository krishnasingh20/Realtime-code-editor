import axios from "axios";

const JUDGE0_HOST = "judge0-ce.p.rapidapi.com";
const MIN_DELAY_BETWEEN_REQUESTS = 500;
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT = 30000;

class Judge0Client {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
  }

  async executeCode(codeData) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ codeData, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const { codeData, resolve, reject } = this.requestQueue.shift();

    try {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < MIN_DELAY_BETWEEN_REQUESTS) {
        await new Promise(r => 
          setTimeout(r, MIN_DELAY_BETWEEN_REQUESTS - timeSinceLastRequest)
        );
      }

      const result = await this.submitWithRetry(codeData);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isProcessing = false;
      this.lastRequestTime = Date.now();
      
      if (this.requestQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  async submitWithRetry(codeData, retries = 0) {
    try {
      const response = await axios.post(
        `https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=true`,
        codeData,
        {
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-key": process.env.RAPID_API_KEY,
            "x-rapidapi-host": JUDGE0_HOST,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && retries < MAX_RETRIES) {
        const delayMs = Math.pow(2, retries) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
        return this.submitWithRetry(codeData, retries + 1);
      }

      throw error;
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}

export default new Judge0Client();