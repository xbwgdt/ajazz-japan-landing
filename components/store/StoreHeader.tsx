"use client";

import { Menu, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { DRIVER_LINK_PROPS } from "../../lib/cms/site-settings";
import { CartLink } from "./CartLink";
import { StoreLogo } from "./StoreLogo";

const navigationId = "store-mobile-navigation";

export function StoreHeader(): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function focusProductSearch(event: MouseEvent<HTMLAnchorElement>) {
    const search = document.getElementById("store-product-search");
    closeMenu();
    if (!(search instanceof HTMLInputElement)) return;

    event.preventDefault();
    search.focus({ preventScroll: true });
    search.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <header className="store-nav store-nav-dark">
      <Link href="/" className="store-brand" aria-label="AJAZZ JAPAN ホーム" onClick={closeMenu}>
        <StoreLogo />
      </Link>

      <nav
        id={navigationId}
        className={`store-primary-nav${menuOpen ? " is-open" : ""}`}
        aria-label="メインナビゲーション"
      >
        <Link href="/#products" onClick={closeMenu}>製品</Link>
        <Link href="/#store-product-search" onClick={focusProductSearch}>カテゴリー</Link>
        <a {...DRIVER_LINK_PROPS} onClick={closeMenu}>ドライバー</a>
        <Link href="/about" onClick={closeMenu}>会社情報</Link>
      </nav>

      <div className="store-nav-actions">
        <Link
          href="/#store-product-search"
          className="store-icon-button"
          aria-label="製品を検索"
          onClick={focusProductSearch}
        >
          <Search aria-hidden="true" size={20} strokeWidth={1.8} />
        </Link>
        <button
          type="button"
          className="store-icon-button store-account-control"
          aria-label="アカウントは現在ご利用いただけません"
          aria-disabled="true"
          title="アカウントは現在ご利用いただけません"
          disabled
        >
          <UserRound aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <CartLink />
        <button
          ref={menuButtonRef}
          type="button"
          className="store-icon-button store-menu-button"
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={menuOpen}
          aria-controls={navigationId}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen
            ? <X aria-hidden="true" size={22} strokeWidth={1.8} />
            : <Menu aria-hidden="true" size={22} strokeWidth={1.8} />}
        </button>
      </div>
    </header>
  );
}
