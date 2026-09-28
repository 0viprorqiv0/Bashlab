'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './LearningDashboard.module.css';

const dateLabel = (date, options) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
const fullDate = (date) => dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

export default function LearningDashboard({ days }) {
  const [range, setRange] = useState(365);
  const [selectedDate, setSelectedDate] = useState(days[days.length - 1].date);
  const calendarRef = useRef(null);
  const visibleDays = days.slice(-range);
  const startOffset = new Date(`${visibleDays[0].date}T00:00:00Z`).getUTCDay();
  const cells = [...Array(startOffset).fill(null), ...visibleDays];
  const weeks = Math.ceil(cells.length / 7);
  const activeDays = visibleDays.filter((day) => day.minutes > 0).length;
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
  let streak = 0;
  for (let index = days.length - 1; index >= 0 && days[index].minutes > 0; index--) streak++;

  useEffect(() => {
    if (calendarRef.current) calendarRef.current.scrollLeft = calendarRef.current.scrollWidth;
  }, [range]);

  function changeRange(event) {
    const nextRange = Number(event.target.value);
    setRange(nextRange);
    if (selectedDate < days[days.length - nextRange].date) setSelectedDate(days[days.length - 1].date);
  }

  function navigateDays(event) {
    const movement = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (!(event.key in movement) || !event.target.dataset.date) return;
    event.preventDefault();
    const index = visibleDays.findIndex((day) => day.date === event.target.dataset.date);
    const next = visibleDays[Math.max(0, Math.min(visibleDays.length - 1, index + movement[event.key]))];
    setSelectedDate(next.date);
    const scroller = calendarRef.current;
    const button = scroller.querySelector(`[data-date="${next.date}"]`);
    button?.focus({ preventScroll: true });
    if (button) {
      const bounds = button.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      if (bounds.left < viewport.left) scroller.scrollLeft -= viewport.left - bounds.left + 12;
      if (bounds.right > viewport.right) scroller.scrollLeft += bounds.right - viewport.right + 12;
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><h1>My Learning<span>.</span></h1><p>Build a little every day. See how far you go.</p></div>
        <a className={styles.browseLink} href="/courses" aria-label="Browse courses">Browse courses <Icon name="arrow_outward" /></a>
      </header>

      <section className={styles.journey} aria-label="Your current course, sample progress">
        <div className={styles.courseMark} aria-hidden="true"><span>$_</span><small>101</small></div>
        <div className={styles.courseCopy}>
          <div className={styles.courseMeta}><span>In progress</span><span>Shell 101</span></div>
          <h2>Make the terminal yours.</h2>
          <p>Bash Basics <span>·</span> 4 of 12 lessons completed</p>
        </div>
        <div className={styles.courseAction}>
          <a href="/login">Continue learning <Icon name="arrow_forward" /></a>
          <div className={styles.courseProgress} role="progressbar" aria-label="Shell 101 sample progress" aria-valuenow={4} aria-valuemin={0} aria-valuemax={12}><span /></div>
        </div>
      </section>

      <section className={styles.overview} aria-label="Learning overview, sample data">
        <dl className={styles.stats}>
          <div><dt>Completed courses</dt><dd>2 <small>/ 5</small></dd></div>
          <div><dt>Lessons mastered</dt><dd>28</dd></div>
          <div><dt>Practice hours</dt><dd>{(totalMinutes / 60).toFixed(1)} <small>hrs</small></dd></div>
          <div className={styles.streakStat}><dt><Icon name="local_fire_department" /> Day streak</dt><dd>{streak} <small>days</small></dd></div>
        </dl>
      </section>

      <section className={styles.activity} aria-labelledby="practice-title">
        <header className={styles.activityHeader}>
          <div><h2 id="practice-title">Consistency looks good on you.</h2><p>Practice activity <span>·</span> <strong>{activeDays}</strong> active days in this period</p></div>
          <div className={styles.activityControls}>
            <span className={styles.sampleLabel}>Sample data</span>
            <label className={styles.rangeControl}>
              <span className={styles.srOnly}>Activity period</span>
              <select value={range} onChange={changeRange}>
                <option value={365}>Last 12 months</option><option value={90}>Last 90 days</option><option value={30}>Last 30 days</option>
              </select><Icon name="expand_more" />
            </label>
          </div>
        </header>

        <div className={styles.calendarArea}>
          <div className={styles.calendarScroll} ref={calendarRef} data-lenis-prevent onKeyDown={navigateDays}>
            <div className={`${styles.calendar} ${range !== 365 ? styles.shortCalendar : ''}`} style={{ '--weeks': weeks }}>
              <div className={styles.months} aria-hidden="true">
                {Array.from({ length: weeks }, (_, index) => {
                  const week = cells.slice(index * 7, index * 7 + 7).filter(Boolean);
                  const firstOfMonth = week.find((day) => day.date.endsWith('-01'));
                  const labelDay = firstOfMonth || (index === 0 ? week[0] : null);
                  return <span key={index}>{labelDay ? dateLabel(labelDay.date, { month: 'short' }) : ''}</span>;
                })}
              </div>
              <div className={styles.weekdays} aria-hidden="true">{['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, index) => <span key={index}>{day}</span>)}</div>
              <div className={styles.cells} role="group" aria-label="Practice calendar. Use arrow keys to move between days.">
                {cells.map((day, index) => day ? (
                  <button key={day.date} type="button" data-date={day.date} data-level={day.level}
                    className={styles.day} aria-pressed={selectedDate === day.date}
                    tabIndex={selectedDate === day.date ? 0 : -1}
                    aria-label={`${fullDate(day.date)}: ${day.minutes} minutes, ${day.sessions} practice sessions`}
                    title={`${dateLabel(day.date, { month: 'short', day: 'numeric' })} · ${day.minutes ? `${day.minutes} min practiced` : 'No practice'}`}
                    onClick={() => setSelectedDate(day.date)} />
                ) : <span key={`empty-${index}`} />)}
              </div>
            </div>
          </div>
          <div className={styles.calendarFooter}>
            <p><Icon name="touch_app" /> Hover over a square to view practice time.</p>
            <div className={styles.legend} aria-label="Practice intensity, from less to more"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}<span>More</span></div>
          </div>
        </div>

      </section>
      <p className={styles.previewNote}>A preview of your learning journey. Activity and course progress shown here are sample data.</p>
    </div>
  );
}
