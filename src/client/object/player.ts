import { BILLION_VALUE, Vector2 } from "../../server/shared/math";
import { TextureManager } from "../texture";
import { ActorObject, GameObjectEvent } from "../shared/game-object";
import { ActorType } from "../../server/shared/entity";
import { ParticleObject } from "../particle";
import { Direction, WalkingState } from "../../shared/actor";
import { GameEvent } from "../event";

export interface ControlMoved{
    moved : Vector2;
    startAt : Vector2;
}

export class Player extends ActorObject{
    private controlMoved : Vector2 | undefined;
    private takeControl : boolean = false;

    constructor(
        textureManager : TextureManager,
        objectId:string,
        pos: Vector2,
        playerName:string
    ){
        super(ActorType.PLAYER,textureManager,objectId,new Vector2(1,1.5),pos,playerName);


        this.setAnchor(0.5,1);
        this.setAnimateSpeed(0.12);
        this.setWalking(WalkingState.SILENT);
        
    }
    addMovePoint(point:Vector2){
        if(this.takeControl)
            this.setPosition(point);    
        else
            super.addMovePoint(point);
    }
    setTakeControl(){
        this.takeControl = true;
        this.smoothMove = false;
    }
    setDirection(direction : Direction,dirty : boolean = true){
        if(this.direction == direction)return;

        const textures = this.getDirectionTextures(direction);
        textures.push(textures.shift()!);

        this.setTextures(textures);
        this.direction = direction;
        this.setWalking(WalkingState.SILENT);

        if(dirty) this.isStatesDirty = true;

    }
    controlMove(delta:Vector2){
        if(!this.controlMoved){
            this.controlMoved = delta;
        }

        if(this.controlMoved){
            const delta = this.controlMoved;
    
            if(delta.y > 0){
                this.setDirection(Direction.FORWARD);
            }else if(delta.y < 0 ){
                this.setDirection(Direction.BACK);
            }else if(delta.x > 0 ){
                this.setDirection(Direction.RIGHT);
            }else if(delta.x < 0 ){
                this.setDirection(Direction.LEFT);
            }
        }

    }
    private doControlMoveTick(tick:number){

        if(this.controlMoved){
            const target = this.getPosition().add(this.controlMoved);
            this.setPosition(target);
            this.setWalking(WalkingState.WALKING);
        }
        if(!this.controlMoved){
            if(this.takeControl){
                this.setWalking(WalkingState.SILENT);
            }
        }

        if(this.controlMoved){

            this.emit(GameEvent.ControlMovedEvent,this.controlMoved,this.direction,this.walking);
            this.controlMoved = undefined;
        }

    }
    private doOrderTick(){
        this.zIndex = 2 + (this.y / BILLION_VALUE + 1) / 2;
    }
    async doTick(tick:number) {
        super.doTick.call(this,tick);

        this.doControlMoveTick(tick);
        this.doOrderTick();
    }

}
