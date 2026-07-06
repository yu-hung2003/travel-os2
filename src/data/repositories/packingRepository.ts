import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { BagKind, PackingItem } from '@/domain/types';

const SUMMER_JP_TEMPLATE: Array<Pick<PackingItem, 'bag' | 'category' | 'name' | 'qty'>> = [
  // 🎒 carry-on
  { bag: 'carry', category: '證件', name: '護照(全員)', qty: 4 },
  { bag: 'carry', category: '證件', name: '日圓現金', qty: 1 },
  { bag: 'carry', category: '證件', name: '信用卡', qty: 2 },
  { bag: 'carry', category: '證件', name: 'ICOCA / Suica(含兒童卡)', qty: 4 },
  { bag: 'carry', category: '證件', name: '電子車票憑證(HARUKA / KKday)', qty: 1 },
  { bag: 'carry', category: '電子', name: 'eSIM / 網卡', qty: 1 },
  { bag: 'carry', category: '電子', name: '行動電源', qty: 2 },
  { bag: 'carry', category: '電子', name: '充電線', qty: 3 },
  { bag: 'carry', category: '防暑', name: '防曬乳(隨身瓶)', qty: 1 },
  { bag: 'carry', category: '防暑', name: '遮陽傘 / 晴雨兩用傘', qty: 2 },
  { bag: 'carry', category: '防暑', name: '手持電風扇', qty: 2 },
  { bag: 'carry', category: '防暑', name: '帽子', qty: 4 },
  { bag: 'carry', category: '防暑', name: '水壺', qty: 4 },
  { bag: 'carry', category: '藥品', name: '常備藥(暈車/腸胃/退燒)', qty: 1 },
  { bag: 'carry', category: '其他', name: '濕紙巾', qty: 2 },
  // 🧳 checked
  { bag: 'checked', category: '衣物', name: '換洗衣物(7天份)', qty: 4 },
  { bag: 'checked', category: '衣物', name: '備用鞋 / 拖鞋', qty: 4 },
  { bag: 'checked', category: '衣物', name: '洗衣袋 / 壓縮袋', qty: 2 },
  { bag: 'checked', category: '盥洗', name: '盥洗用品', qty: 1 },
  { bag: 'checked', category: '防暑', name: '防曬乳(補充瓶)', qty: 1 },
  { bag: 'checked', category: '防暑', name: '防蚊液', qty: 1 },
  { bag: 'checked', category: '其他', name: '摺疊購物袋(血拼用)', qty: 2 },
  { bag: 'checked', category: '其他', name: '雨衣 / 輕便雨具', qty: 4 },
  { bag: 'checked', category: '其他', name: '行李秤(退稅血拼防超重)', qty: 1 },
];

export const packingRepository = {
  list(tripId: string): Promise<PackingItem[]> {
    return db.packing.where('tripId').equals(tripId).toArray();
  },

  async add(input: {
    tripId: string;
    bag: BagKind;
    name: string;
    qty: number;
    category?: string;
    ownerId?: string;
    highlight?: boolean;
  }): Promise<void> {
    await db.packing.add({
      id: newId(),
      tripId: input.tripId,
      bag: input.bag,
      category: input.category?.trim() || '其他',
      name: input.name.trim(),
      qty: Math.max(1, Math.round(input.qty)),
      checked: false,
      ownerId: input.ownerId,
      highlight: input.highlight || undefined,
    });
  },

  async toggleHighlight(id: string): Promise<void> {
    const item = await db.packing.get(id);
    if (!item) return;
    await db.packing.update(id, { highlight: !item.highlight || undefined });
  },

  /** restore a just-deleted item (undo) */
  async restore(item: import('@/domain/types').PackingItem): Promise<void> {
    await db.packing.put(item);
  },

  async toggle(id: string): Promise<void> {
    const item = await db.packing.get(id);
    if (!item) return;
    await db.packing.update(id, { checked: !item.checked });
  },

  async remove(id: string): Promise<void> {
    await db.packing.delete(id);
  },

  async resetChecks(tripId: string): Promise<void> {
    await db.packing.where('tripId').equals(tripId).modify({ checked: false });
  },

  /** apply the template for one owner (or shared); returns ids for undo */
  async applyTemplate(tripId: string, ownerId?: string): Promise<string[]> {
    const items: PackingItem[] = SUMMER_JP_TEMPLATE.map((t) => ({
      id: newId(),
      tripId,
      checked: false,
      ownerId,
      ...t,
    }));
    await db.packing.bulkAdd(items);
    return items.map((i) => i.id);
  },

  async removeMany(ids: string[]): Promise<void> {
    await db.packing.bulkDelete(ids);
  },
};
