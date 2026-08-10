import { describe, expect, it } from "vitest";
import { getOrderStatusDisplay } from "../../lib/commerce/order-confirmation";
import type { OrderStatus } from "../../lib/commerce/types";

describe("order confirmation status display", () => {
  const expected: Record<OrderStatus, {
    heading: string;
    payment: string;
    shipment: string;
  }> = {
    paid: {
      heading: "ご注文を受け付けました。",
      payment: "決済完了",
      shipment: "発送準備を開始します。通常3営業日以内に発送します。",
    },
    awaiting_fulfillment: {
      heading: "ご注文を受け付けました。",
      payment: "決済完了",
      shipment: "発送準備中です。通常3営業日以内に発送します。",
    },
    shipped: {
      heading: "商品を発送しました。",
      payment: "決済完了",
      shipment: "発送済みです。追跡情報は発送案内メールをご確認ください。",
    },
    cancelled: {
      heading: "ご注文はキャンセルされました。",
      payment: "注文キャンセル",
      shipment: "この注文の商品は発送されません。",
    },
    refund_pending: {
      heading: "返金手続き中です。",
      payment: "返金処理中",
      shipment: "返金状況は完了後にメールでご案内します。",
    },
    refunded: {
      heading: "返金が完了しました。",
      payment: "返金完了",
      shipment: "返金先への反映時期は決済会社により異なります。",
    },
  };

  for (const status of Object.keys(expected) as OrderStatus[]) {
    it(`maps ${status} to truthful customer-facing copy`, () => {
      expect(getOrderStatusDisplay(status)).toEqual(expected[status]);
    });
  }
});
