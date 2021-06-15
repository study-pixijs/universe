import { doTickable } from "../../shared/update";
import { GetUniqueId, Vector2 } from "../shared/math";
import { EventEmitter } from "../shared/event";
import { Direction, WalkingState } from "../../shared/actor";
import { LocToLandLoc } from "../land/helper";

export const MOVEMENT_TICK_MIN_DISTANCE = 0.0001;

export function BuildActorHash(item:string | Actor) : string{
    if(typeof item == "string")
        return `actor.id.${item}`;
    
    return BuildActorHash(item.getActorId());
}


export enum ActorEvent{
    NewPosEvent = "NewPosEvent",
    NewBaseStateEvent = "NewBaseStateEvent",
    AddActorEvent = "AddActorEvent",
    RemoveActorEvent = "RemoveActorEvent",
    LandMoveEvent = "LandMoveEvent"
}

export interface IEntity extends doTickable,EventEmitter{ }

export abstract class Entity extends EventEmitter implements IEntity{
    protected entityId : string;
    constructor(){
        super();
        this.entityId = GetUniqueId();
    }
    getEntityId(){
        return this.entityId;
    }
    abstract doTick(tick: number): Promise<void>;
}

export enum ActorType{
    NONE = "none",
    HUMAN = "human",
    PLAYER = "player"
}
export class Actor extends Entity{

    /**
     * 用于序列化的Actor类型名
     */
    static ENTITY_TYPE = "Actor";

    protected loc : Vector2;
    protected motion : Vector2 = new Vector2(0, 0);
    protected type : ActorType;

    private direction : Direction = Direction.FORWARD;
    private walking : WalkingState = WalkingState.SILENT;

    private hasBaseStateChanged = false;
    private hasLocChanged = false;

    constructor(loc : Vector2,type : ActorType){
        super();
        this.loc = loc;

        this.type = type;
        
    }
    getWalking(){
        return this.walking;
    }
    setWalking(walking:WalkingState){
        if(this.walking === walking)
            return;
        
        this.walking = walking;
        this.hasBaseStateChanged = true;
    }
    setDirection(dir : Direction){
        if(this.direction === dir)
            return;

        this.direction = dir;
        this.hasBaseStateChanged = true;
    }
    getDirection(){
        return this.direction;
    }
    getType(){
        return this.type;
    }
    getLandAt(){
        return LocToLandLoc(this.loc);
    }
    getActorId(){
        return this.entityId;
    }

    /**
     * 获取Actor在3D世界的位置
     */
    getLocation(){
        return this.loc;
    }
    getMotion(){
        return this.motion;
    }
    setMotion(motion:Vector2){
        this.motion = motion;
    }
    /**
     * 强制设置位置坐标
     */
    setLocation(target_loc:Vector2){
        this.checkLandMove(this.loc,target_loc);

        this.loc = target_loc;
        this.hasLocChanged = true;

    }
    moveDelta(delta:Vector2){
        if(delta.getSqrt() <= 0) return;

        this.setLocation(this.loc.add(delta));
    }

    private checkLandMove(last_loc:Vector2,curr_loc : Vector2){
        const lastLand = LocToLandLoc(last_loc);
        const currLand = LocToLandLoc(curr_loc);
        if(currLand.equals(lastLand)) return;

        this.emit(ActorEvent.LandMoveEvent,this,currLand,lastLand);

    }


    async doTick(tick : number){
        this.doMovementTick();

    }

    private doEmitMoveTick(){
        if(this.hasLocChanged){
            this.emit(ActorEvent.NewPosEvent,this);
            this.hasLocChanged = false;

        }
    }
    private doMotionTick(){ 
        this.moveDelta(this.motion);
    }
    private doBaseStateTick(){
        if(this.hasBaseStateChanged){
            this.emit(ActorEvent.NewBaseStateEvent,this);
            this.hasBaseStateChanged = false;
        }
    }
    private doMovementTick(){
        this.doMotionTick();
        this.doEmitMoveTick();
        this.doBaseStateTick();

    }

}

