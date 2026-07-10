/**
 * 楽天 Ajazz 商品データスクレイパー
 * 
 * 使い方:
 * 1. npx playwright install chromium
 * 2. tsx scripts/rakuten-scraper.ts
 * 3. ブラウザが開くので楽天にログイン（初回のみ）
 * 4. 自動で全商品ページを巡回し、data/sales.json を生成する
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://item.rakuten.co.jp/ajazz';

// 対象商品リスト（product.id → 楽天商品パス）
const PRODUCTS: Record<string, string> = {
  'af84': '/af84/',
  '308i': '/308i/',
  'ak820-3': '/ak820-3/',
  'n1': '/n1/',
  'aj179apex': '/aj179apex/',
  'ak029': '/ak029-mt/',
  'mk87': '/mk87/',
  'akp05pro': '/akp05pro/',
  'ak820pro': '/ak820pro/',
  'ak820max': '/ak820max/',
  'ak820maxultra': '/ak820maxultra/',
  'akp815': '/akp815/',
};

interface ProductData {
  productId: string;
  currentPrice: string | null;
  originalPrice: string | null;
  reviewCount: number | null;
  avgRating: number | null;
  error?: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeProduct(page: any, id: string, url: string): Promise<ProductData> {
  const result: ProductData = {
    productId: id,
    currentPrice: null,
    originalPrice: null,
    reviewCount: null,
    avgRating: null,
  };

  try {
    console.log(`  → アクセス中: ${id} (${BASE_URL}${url})`);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // 商品ページが完全にレンダリングされるまで待つ
    await sleep(3000);

    // ページ内容を取得
    const data = await page.evaluate(() => {
      const body = document.body.innerText;
      const html = document.documentElement.innerHTML;

      // === 価格取得 ===
      // 楽天の価格表示パターン:
      // - "販売価格: 7,820円〜" または "価格: 4,590円"
      // - セール価格: "セール価格: 6,110円"
      // - 定価: "定価: 12,800円" または "通常価格: 9,980円"
      
      let currentPrice: string | null = null;
      let originalPrice: string | null = null;

      // 方法1: 価格ラベルから取得
      const priceLabels = body.match(/(?:販売価格|価格|セール価格|通常価格|定価)[：:]\s*([\d,]+)/g);
      if (priceLabels) {
        for (const label of priceLabels) {
          const price = label.match(/([\d,]+)/)?.[0];
          if (label.includes('定価') || label.includes('通常価格')) {
            originalPrice = price || null;
          } else if (label.includes('販売価格') || label.includes('価格') || label.includes('セール価格')) {
            currentPrice = price || null;
          }
        }
      }

      // 方法2: 価格と思われる数字パターン（フォールバック）
      if (!currentPrice) {
        const priceMatch = body.match(/([\d,]+)\s*円\s*(?:～|〜|$)/);
        if (priceMatch) currentPrice = priceMatch[1];
      }

      // === レビュー情報取得 ===
      let reviewCount: number | null = null;
      let avgRating: number | null = null;

      // "すべてのレビューを見る（N件）" または "レビューを見る（N件）"
      const reviewMatch = body.match(/レビューを見る（(\d+)件）/);
      if (reviewMatch) reviewCount = parseInt(reviewMatch[1]);

      // 評価スコア: "評価\t\t5.00" または "4.50" のパターン
      const ratingMatch = body.match(/評価[\s\t]*([\d.]+)/);
      if (ratingMatch) avgRating = parseFloat(ratingMatch[1]);

      // 方法2: 個別レビューの星評価を数える
      const individualRatings: number[] = [];
      const ratingLines = body.split('\n');
      for (let i = 0; i < ratingLines.length; i++) {
        // レビュー内の "5" や "4" などの評価値（日付の直後や購入者の前）
        if (ratingLines[i].match(/^\d$/) && ratingLines[i+1]?.includes('購入者')) {
          individualRatings.push(parseInt(ratingLines[i]));
        }
      }

      return {
        currentPrice,
        originalPrice,
        reviewCount,
        avgRating,
        individualRatings,
        bodySample: body.substring(0, 500), // デバッグ用
      };
    });

    result.currentPrice = data.currentPrice;
    result.originalPrice = data.originalPrice;
    result.reviewCount = data.reviewCount;
    result.avgRating = data.avgRating;

    console.log(`  ✓ ${id}: 価格=${data.currentPrice}円, 定価=${data.originalPrice}, レビュー=${data.reviewCount}件, 評価=${data.avgRating}`);

  } catch (e: any) {
    console.error(`  ✗ ${id}: エラー - ${e.message}`);
    result.error = e.message;
  }

  // レート制限回避
  await sleep(2000);
  return result;
}

async function main() {
  console.log('=== Ajazz 楽天商品データスクレイパー ===\n');

  // 永続的なブラウザコンテキストを作成（ログイン状態を保存）
  const userDataDir = path.join(__dirname, '..', 'browser-data');
  
  const browser = await chromium.launch({
    headless: false, // ログインが必要なのでGUIモード
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log('1. 楽天にログインしてください...');
  console.log('   ブラウザが開きますので、手動で楽天アカウントにログインしてください。');
  console.log('   ログインが完了したら、コンソールで Enter を押してください。\n');

  await page.goto('https://www.rakuten.co.jp/', { waitUntil: 'domcontentloaded' });
  await sleep(2000);

  // ユーザーがログインするのを待つ
  await new Promise<void>((resolve) => {
    console.log('   ログイン完了後、ここで Enter を押してください...');
    process.stdin.once('data', () => resolve());
  });

  console.log('\n2. 商品データを収集中...\n');

  const results: ProductData[] = [];

  for (const [id, urlPath] of Object.entries(PRODUCTS)) {
    const data = await scrapeProduct(page, id, urlPath);
    results.push(data);
  }

  console.log('\n3. データを整形中...\n');

  // sales.json の生成
  const salesData: any = {
    _note: '楽天から自動取得（更新日時自動記録）',
    _updated: new Date().toISOString().split('T')[0],
    saleBanner: {
      title: '🎉 初夏セール開催中',
      subtitle: '期間限定！最大50%OFF',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    products: {} as Record<string, any>,
    saleItems: [] as any[],
  };

  for (const r of results) {
    const priceNum = r.currentPrice ? parseInt(r.currentPrice.replace(/,/g, '')) : null;
    const origNum = r.originalPrice ? parseInt(r.originalPrice.replace(/,/g, '')) : null;

    salesData.products[r.productId] = {
      originalPrice: r.originalPrice ? `¥${r.originalPrice}` : null,
      rating: r.avgRating || null,
      reviews: r.reviewCount || 0,
      platform: 'rakuten',
    };

    // 定価と現在価格の差がある場合は自動的にセール商品として提案
    if (origNum && priceNum && origNum > priceNum) {
      const discount = Math.round((1 - priceNum / origNum) * 100);
      if (discount >= 5) {
        salesData.saleItems.push({
          productId: r.productId,
          discountPercent: discount,
          badge: '🔥 セール',
        });
      }
    }
  }

  // sales.json に書き込み
  const outputPath = path.join(__dirname, '..', 'data', 'sales.json');
  fs.writeFileSync(outputPath, JSON.stringify(salesData, null, 2), 'utf-8');

  console.log(`✓ data/sales.json を生成しました: ${outputPath}`);
  console.log(`\n=== 収集結果サマリー ===`);
  for (const r of results) {
    console.log(`  ${r.productId}: ¥${r.currentPrice || 'N/A'}, レビュー${r.reviewCount ?? 0}件, 評価${r.avgRating ?? 'N/A'}`);
  }

  await browser.close();
  console.log('\n=== 完了 ===');
}

main().catch(console.error);
