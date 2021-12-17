import { inject, injectable } from 'inversify';
import { ActorType, Actor } from '../actor-module/spec';
import { Arrow, Bow } from './bow-entity';
import { ExtendedEntityManager } from '../../../framework/server-side/server-manager';
import { ActorManager } from '../actor-module/actor-manager';

import * as Events from '../../event/internal';
import { HandleInternalEvent } from '../../../framework/event';
import { Vector2 } from '../../shared/math';

import SAT from 'sat';

export const ARROW_DROP_TICKS = 10;
export const ARROW_DEAD_TICKS = 30;
export const BOW_DRAGGING_MAX_TICKS = 25;
export const BOW_RELEASING_MIN_TICKS = 10;

@injectable()
export class BowManager extends ExtendedEntityManager<Actor, Bow> {
	constructor(@inject(ActorManager) private actorManager: ActorManager) {
		super(actorManager, Bow);
	}

	@HandleInternalEvent('actorManager', Events.ActorToggleUsingEvent)
	private onActorToggleUsing(event: Events.ActorToggleUsingEvent) {
		const actor = this.actorManager.getEntityById(event.actorId);
		if (actor.type != ActorType.BOW) return;

		if (event.startOrEnd) {
			this.startDragging(actor);
		} else {
			this.endDragging(actor, event.useTick);
		}
	}

	private doCollisionTick() {
		const arrows = this.actorManager.findEntities({ type: ActorType.ARROW });
		for (const actor of arrows) {
			const arrow = actor as Arrow;
			const shooter = this.actorManager.getEntityById(arrow.shooter);
			const pos = new Vector2(arrow.posX, arrow.posY);
			const lastPos = new Vector2(arrow.lastPosX, arrow.lastPosY);

			const polygon = new SAT.Polygon(new SAT.Vector(), [pos.toSATVector(), lastPos.toSATVector()]);
			const collisions = this.actorManager.getCollisionWith(polygon, pos, [shooter], true);

			const damageTarget = collisions.find((collision) => collision.actor.canDamage);
			if (damageTarget) {
				this.arrowDamageActor(arrow, damageTarget.actor);
				break;
			}
		}
	}

	private startDragging(actor: Actor) {}

	private endDragging(actor: Actor, useTick: number) {
		if (useTick <= BOW_RELEASING_MIN_TICKS) return;

		const attachingActor = this.actorManager.getEntityById(actor.attaching.actorId);
		const aimTarget = attachingActor.aimTarget;

		if (aimTarget === undefined) return;

		const arrow = new Arrow();
		arrow.posX = actor.posX;
		arrow.posY = actor.posY;
		arrow.shooter = attachingActor.$loki;

		arrow.power = Math.min(useTick, BOW_DRAGGING_MAX_TICKS) / 20;

		const motion = arrow.power * 2;

		arrow.rotation = aimTarget;
		this.addNewEntity(arrow);

		this.actorManager.setMotion(arrow.$loki, new Vector2(motion * Math.cos(aimTarget), motion * Math.sin(aimTarget)));
	}

	private doAliveTick() {
		const arrows = this.findEntities({ type: ActorType.ARROW });
		for (const item of arrows) {
			const arrow = item as Arrow;
			arrow.aliveTick += 1;

			if (arrow.aliveTick >= ARROW_DROP_TICKS) {
				arrow.motionX = 0;
				arrow.motionY = 0;
			}

			if (arrow.aliveTick >= ARROW_DEAD_TICKS) {
				this.removeEntity(arrow);
			} else {
				this.updateEntity(arrow);
			}
		}
	}

	private arrowDamageActor(arrow: Arrow, actor: Actor) {
		this.actorManager.damageActor(actor, 10, arrow.rotation, arrow.power);

		arrow.aliveTick = ARROW_DEAD_TICKS;
		this.updateEntity(arrow);
	}

	doTick() {
		this.doCollisionTick();
		this.doAliveTick();
	}
}
