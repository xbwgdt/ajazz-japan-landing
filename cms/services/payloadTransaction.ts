import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from "payload";

type PayloadTransactionAPI = {
  commitTransaction: typeof commitTransaction;
  createLocalReq: typeof createLocalReq;
  initTransaction: typeof initTransaction;
  killTransaction: typeof killTransaction;
};

const transactionAPI: PayloadTransactionAPI = {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
};

export async function runPayloadTransaction<T>(
  payload: Payload,
  work: (req: PayloadRequest) => Promise<T>,
  api: PayloadTransactionAPI = transactionAPI,
): Promise<T> {
  const req = await api.createLocalReq({}, payload);
  const ownsTransaction = await api.initTransaction(req);
  if (!ownsTransaction) throw new Error("Payload database transactions are unavailable");

  try {
    const result = await work(req);
    await api.commitTransaction(req);
    return result;
  } catch (error) {
    await api.killTransaction(req);
    throw error;
  }
}
