# 单词记忆接口补充

以下接口均需要登录，沿用项目统一的 `{ code, msg, data }` 响应格式。

## 自动打卡与 GET `/study/calendar?month=2026-10`

每次正式学习评分成功后，后端检查当前到期卡片和今日可学新词。若队列已清空，则在评分事务内按用户学习时区写入当天的唯一打卡记录；当天稍后到期的卡片不阻止打卡，也不取消已有打卡。当天已有正式评分但尚未打卡的用户，读取 `/study/today`、`/study/stats` 或 `/study/calendar` 时也会按当前队列补写当天打卡。没有学习评分的空任务日不会自动打卡；自由练习不计入。`GET /study/today` 和 `GET /study/stats` 均返回 `checkedIn` 布尔字段。

`month` 可省略，默认用户学习时区的当前月；格式为 `YYYY-MM`，可查看当前月及此前十年。返回 `month`、`today`、`checkedInToday`、`currentStreak`、`longestStreak`、`totalCheckIns` 与 `days`。`days` 包含当月每一天，字段为 `date`、`checkedIn`、`reviewCount`、`newWords`、`studyTimeMs`。连续天数截至今天；如果今天尚未打卡，则截至昨天。

部署前先执行后端 `study_check_in_table.sql`。已有历史评分不会自动补成打卡，因为无法可靠重建当时的任务队列和学习设置。

## GET `/study/history?days=7`

`days` 只接受 `7` 或 `30`，默认 `7`。返回按日期升序排列的每日记录，包含没有评分的日期。

```json
{
  "date": "2026-10-20",
  "reviewCount": 12,
  "newWords": 5,
  "studyTimeMs": 84000,
  "dueRecallAttempts": 4,
  "dueRecallRate": 0.75,
  "goodOrEasyRate": 0.5,
  "dueBacklog": 8
}
```

- 日期按用户当前学习设置中的时区划分。`newWords` 是当天首次评分的单词数；`reviewCount` 是评分次数，包含短时重学。
- `studyTimeMs` 为客户端上报的评分用时之和，单次最多计入 10 分钟，属于近似学习用时。
- 正式到期回忆仅统计评分前状态为 `REVIEW` 且已经到期的卡片；评分大于 1 视为回忆成功。样本数为 0 时，`dueRecallRate` 为 `null`。
- `goodOrEasyRate` 使用同一组正式到期回忆样本，其中评分为 3（记得）或 4（容易）的占比；样本数为 0 时为 `null`。
- 历史 `dueBacklog` 从评分记录回算，表示该日结束时到期未复习的卡片数；今天表示当前数。

## GET `/study/review-counts`

返回当前已学习单词按每词累计评分次数分组的数量：`once`、`twice`、`threeToFive`、`sixOrMore`。每个词只计入一个分组。

## 词书覆盖率字段

词书列表和详情新增 `learningCoverage`，计算方式是 `learnedCount / wordCount × 100` 的整数百分比，表示学习覆盖率。旧字段 `mastery` 暂时返回相同数值以兼容旧客户端；它不表示单词已掌握。

## GET `/study/familiarity?bookId=12&stage=ALL&page=1`

`bookId` 可省略，表示全部已学单词；指定时必须是当前用户可访问的词书。`stage` 可选 `ALL`、`LEARNING`、`CONSOLIDATING`、`STABLE`，默认 `ALL`；`page` 从 1 开始，每页 20 个词。

返回总去重词数 `learnedCount`、三个互斥阶段词数、独立的当前到期词数 `dueCount`，以及分页列表 `words`、本范围内最多 5 个 `attentionWords`。阶段按卡片状态和 FSRS 稳定性划分：`LEARNING` 包含学习与重学状态；处于正式复习状态且稳定性达到 30 天为 `STABLE`；其余正式复习卡为 `CONSOLIDATING`。到期状态按当前时间与 `dueAt` 比较，不改变阶段归属。

`attentionWords` 收录最近一次评分为 1，或正式复习中累计遗忘至少 2 次的词。列表中的 `stabilityDays` 是模型估计值，仅供解释阶段，不表示用户已经永久掌握。
