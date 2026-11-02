# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Individual importers** buying one Japanese used car for themselves from abroad (primary).
- **Overseas dealers** buying in volume to resell (primary).
- **Agents / middlemen** buying on behalf of local clients (occasional). The site's `/verify-agent` page exists because buyers need to tell genuine agents from fraudsters.

Buyers are overseas, often on phones, often on slow connections, and are sending money internationally to a company they have never visited.

## Product Purpose

Al Mashriq Trading exports Japanese used cars, auto parts, complete units and heavy machinery worldwide. The public site lets buyers browse live stock (FOB prices), ask for a quote, and contact staff (WhatsApp first). Success is a qualified inquiry that turns into an export sale. The same codebase is the staff ERP.

## Positioning

A Japan-based exporter selling its own live inventory (each car with a stock number, genuine photos and FOB price), with export documentation and RoRo/container shipping handled in-house, rather than a listing aggregator.

## Operating Context

Markets: Africa, the Middle East and Pakistan, Asia-Pacific and the Caribbean (all matter). Buyers compare against other Japanese exporters, ask on WhatsApp, pay by bank transfer to the company account on the invoice, and track their order in a customer account.

## Capabilities and Constraints

- Live stock from the ERP: cars, parts, complete units, machinery; offers; blog; reviews; customer accounts and invoices; quote and inquiry forms; WhatsApp click tracking.
- Keep existing URLs, data and functionality. English / 日本語.
- Next.js 15 on Cloudflare Workers; public data only through `public_*` RPCs (no cost, chassis or customer PII).
- Shipping charges are estimates only; never presented as confirmed prices.

## Brand Commitments

Name: Al Mashriq Trading Co., Ltd. (Japan). Existing logo in the site header.

## Evidence on Hand

The owner confirms the site can truthfully show: real yard/office/loading photos (to be supplied), Japanese company registration and dealer licence number (to be supplied), verifiable reviews, and real founding year / export volume (to be supplied). Until each is supplied, leave a clearly marked placeholder or omit it; never invent figures, licence numbers, testimonials or photos.

## Product Principles

1. Trust before inventory: an overseas buyer must believe the company is real before a car matters.
2. Every vehicle is one tap from an inquiry.
3. Only state what can be substantiated; one live count everywhere.
4. Fast and legible on a mid-range phone on a slow connection.

## Accessibility & Inclusion

Many buyers read English as a second language: plain wording, large tap targets, readable contrast, WCAG AA.
