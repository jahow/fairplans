import { ObjectStatus, BaseSchema } from '../collections';

export enum MilestoneStatus {
    NOT_REACHED = 0,
    REACHED = 1,
    INVOICED = 2,
}

// PROJECT MILESTONES
// a milestone is a point in time
export interface Milestone {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    projectId: string,        // link is done with id
    date: Date,
    milestoneStatus?: MilestoneStatus,

    // denormalized data
    projectName?: string,
    partnerName?: string,
    companyName?: string,
}
export const MilestoneSchema = new SimpleSchema(Object.assign({
    projectId: {
        type: String,
        denyUpdate: true,
    },
    date: {
        type: Date,
    },
    milestoneStatus: {
        type: Number,
        allowedValues: [
            MilestoneStatus.NOT_REACHED,
            MilestoneStatus.REACHED,
            MilestoneStatus.INVOICED,
        ],
        defaultValue: 0,
    },

    // denormalized
    projectName: {
        type: String,
        optional: true,
    },
    partnerName: {
        type: String,
        optional: true,
    },
    companyName: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const Milestones = new Mongo.Collection<Milestone>('Milestones');
Milestones.attachSchema(MilestoneSchema);