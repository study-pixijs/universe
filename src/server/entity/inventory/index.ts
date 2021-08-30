import { Entity } from '../../../shared/database/memory';
import { Item } from '../item/item';

export type Block = Item | undefined;

export class Inventory extends Entity {}

export class PlayerInventory extends Inventory {
	size = 5;
	currentIndex = 0;
	playerId: number;
}
