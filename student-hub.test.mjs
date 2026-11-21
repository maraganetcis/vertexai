import assert from 'node:assert/strict';
import {
 STUDENT_APPS,STUDENT_WIDGETS,DEFAULT_APP_VISIBILITY,DEFAULT_WIDGET_VISIBILITY,
 normalizeHubWidgetOrder,normalizeHomeApps,normalizeHomeWidgets,moveWidget,combinedCalendarEntries
} from './student-hub.js';

assert.ok(STUDENT_APPS.length>=11,'All student app routes must be discoverable');
assert.ok(STUDENT_WIDGETS.length>=11,'Each module should be widget-ready');
assert.equal(new Set(STUDENT_APPS.map(x=>x.id)).size,STUDENT_APPS.length);
assert.equal(new Set(STUDENT_WIDGETS.map(x=>x.id)).size,STUDENT_WIDGETS.length);
assert.ok(STUDENT_WIDGETS.every(w=>STUDENT_APPS.some(x=>x.id===w.app)),'Every widget must link to an existing app');

const defaultWidgets=normalizeHomeWidgets({calendar:false,timetable:true,unknown:true});
assert.equal(defaultWidgets.calendar,false);
assert.equal(defaultWidgets.timetable,true);
assert.equal(defaultWidgets.academic,true);
assert.equal(defaultWidgets.unknown,undefined);

const defaultApps=normalizeHomeApps({calendar:false,unknown:true});
assert.equal(defaultApps.calendar,false);
assert.equal(defaultApps.unknown,undefined);
assert.equal(defaultApps.notes,true);
assert.equal(DEFAULT_APP_VISIBILITY.calendar,true);
assert.equal(DEFAULT_WIDGET_VISIBILITY.academic,true);

const order=normalizeHubWidgetOrder(['academic','calendar','academic','unknown']);
assert.equal(order[0],'academic');
assert.equal(order[1],'calendar');
assert.equal(order.filter(x=>x==='academic').length,1);
assert.equal(order.length,STUDENT_WIDGETS.length);
const moved=moveWidget(order,'academic','down');
assert.equal(moved[1],'academic');
assert.equal(order[0],'academic','Reorder must not mutate original arrays');
assert.deepEqual(moveWidget(order,'academic','up'),order,'Cannot go beyond first position');

const today='2026-11-22',tomorrow='2026-11-23';
const state={
 events:[{id:'ev-1',date:today,time:'15:00',title:'학원',category:'학원'}],
 academicEvents:[
  {id:'neis-1',date:today,title:'중간고사',source:'neis',kind:'시험'},
  {id:'school-1',date:tomorrow,title:'현장체험학습',kind:'학사'}
 ],
 tasks:[{id:'task-1',due:today,text:'수학 수행평가',done:false,subject:'수학'},
        {id:'done-1',due:today,text:'완료한 과제',done:true}],
 ddays:[{id:'dday-1',date:tomorrow,title:'시험 준비'}]
};
const before=JSON.stringify(state);
const todayEvents=combinedCalendarEntries(state,{date:today});
assert.deepEqual(todayEvents.map(x=>x.origin),['academic','task','event']);
assert.equal(todayEvents.length,3,'Finished tasks must be omitted from the calendar by default');
assert.equal(combinedCalendarEntries(state,{date:today,category:'학원'}).length,1);
assert.equal(combinedCalendarEntries(state,{date:today,category:'학교/수업'}).length,1);
assert.equal(combinedCalendarEntries(state,{date:today,category:'시험/과제'}).length,1);
assert.equal(combinedCalendarEntries(state,{date:today,includeCompleted:true}).length,4);
assert.equal(todayEvents.find(x=>x.origin==='academic').source,'NEIS');
assert.equal(todayEvents.find(x=>x.origin==='task').record.id,'task-1');
assert.equal(combinedCalendarEntries(state,{date:tomorrow}).length,2);
assert.equal(JSON.stringify(state),before,'Calendar is a read-only view; original user data cannot be copied or mutated');

state.academicEvents.push({id:'neis-2',date:today,title:'기말고사',source:'neis'});
assert.equal(combinedCalendarEntries(state,{date:today,category:'학교/수업'}).length,2,'School update must appear without manual duplication');
state.tasks[0].done=true;
assert.equal(combinedCalendarEntries(state,{date:today,category:'시험/과제'}).length,0,'Completing a task in its app must immediately update calendar');
state.events[0].title='학원 시간 변경';
assert.ok(combinedCalendarEntries(state,{date:today}).some(x=>x.title==='학원 시간 변경'),'Editing the schedule in another app updates calendar');

console.log('PASS: student launcher catalog, per-app widgets, order migration, NEIS/personal/task/DDay unified read-only calendar');
