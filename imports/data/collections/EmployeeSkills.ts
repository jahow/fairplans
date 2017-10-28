import { ObjectStatus, BaseSchema } from '../collections';

// EMPLOYEE SKILLS
//
export interface EmployeeSkill {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    name: string,
}
export const EmployeeSkillSchema = new SimpleSchema(Object.assign({
    name: {
        type: String,
    },
}, BaseSchema));
export const EmployeeSkills = new Mongo.Collection<EmployeeSkill>('EmployeeSkills');
EmployeeSkills.attachSchema(EmployeeSkillSchema);
