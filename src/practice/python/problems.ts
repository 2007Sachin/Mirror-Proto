import type { Level } from '../types'

export interface PyTest { name: string; call: string; expected: string }
export interface PyProblem {
  id: string
  topic: 'Strings and dicts' | 'Lists and loops' | 'Data cleaning' | 'Algorithms'
  level: Level
  title: string
  minutes: number
  prompt: string
  starter: string
  hint: string
  solution: string
  tests: PyTest[]
}

// Plain Python 3, standard library only. Each test's `call` and `expected` are Python expressions.
export const problems: PyProblem[] = [
  {
    id: 'python-word-count', topic: 'Strings and dicts', level: 1, title: 'Count the words', minutes: 6,
    prompt: 'Write word_count(text) that returns a dict of how many times each word appears. Ignore capital letters and split on spaces.\n\nExample: word_count("the cat the") returns {"the": 2, "cat": 1}.',
    starter: 'def word_count(text):\n    pass\n',
    hint: 'Lower-case the text, split it, then add one to a dict entry for each word. dict.get(word, 0) saves an if.',
    solution: 'def word_count(text):\n    counts = {}\n    for word in text.lower().split():\n        counts[word] = counts.get(word, 0) + 1\n    return counts\n',
    tests: [
      { name: 'Repeated word', call: 'word_count("the cat the")', expected: '{"the": 2, "cat": 1}' },
      { name: 'Capital letters', call: 'word_count("Go go GO")', expected: '{"go": 3}' },
      { name: 'Empty text', call: 'word_count("")', expected: '{}' },
    ],
  },
  {
    id: 'python-flatten', topic: 'Lists and loops', level: 1, title: 'Flatten one level', minutes: 6,
    prompt: 'Write flatten(rows) that turns a list of lists into one list, keeping the order.\n\nExample: flatten([[1, 2], [3], []]) returns [1, 2, 3].',
    starter: 'def flatten(rows):\n    pass\n',
    hint: 'Start with an empty list. Loop over the rows, then loop over each row and append.',
    solution: 'def flatten(rows):\n    out = []\n    for row in rows:\n        for x in row:\n            out.append(x)\n    return out\n',
    tests: [
      { name: 'Mixed rows', call: 'flatten([[1, 2], [3], []])', expected: '[1, 2, 3]' },
      { name: 'No rows', call: 'flatten([])', expected: '[]' },
      { name: 'Strings', call: 'flatten([["a"], ["b", "c"]])', expected: '["a", "b", "c"]' },
    ],
  },
  {
    id: 'python-clean-names', topic: 'Data cleaning', level: 1, title: 'Tidy a list of names', minutes: 8,
    prompt: 'Write clean_names(names). Strip spaces, make each name Title Case, drop blank names, and remove repeats while keeping the first one in its original place.\n\nExample: clean_names(["  ada lovelace", "ADA LOVELACE", "", "alan turing "]) returns ["Ada Lovelace", "Alan Turing"].',
    starter: 'def clean_names(names):\n    pass\n',
    hint: 'Clean each name first, skip it if it is empty, and keep a set of names you have already seen.',
    solution: 'def clean_names(names):\n    seen = set()\n    out = []\n    for n in names:\n        n = n.strip().title()\n        if n and n not in seen:\n            seen.add(n)\n            out.append(n)\n    return out\n',
    tests: [
      { name: 'Messy list', call: 'clean_names(["  ada lovelace", "ADA LOVELACE", "", "alan turing "])', expected: '["Ada Lovelace", "Alan Turing"]' },
      { name: 'Only blanks', call: 'clean_names(["", "   "])', expected: '[]' },
      { name: 'Order kept', call: 'clean_names(["bo", "al", "bo"])', expected: '["Bo", "Al"]' },
    ],
  },
  {
    id: 'python-first-unique', topic: 'Algorithms', level: 1, title: 'First character that appears once', minutes: 8,
    prompt: 'Write first_unique(s) that returns the first character that appears exactly once in s, or None if there is none.\n\nExample: first_unique("swiss") returns "w".',
    starter: 'def first_unique(s):\n    pass\n',
    hint: 'Count every character first. Then walk the string again and return the first one with a count of 1.',
    solution: 'def first_unique(s):\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    for ch in s:\n        if counts[ch] == 1:\n            return ch\n    return None\n',
    tests: [
      { name: 'Simple word', call: 'first_unique("swiss")', expected: '"w"' },
      { name: 'Nothing unique', call: 'first_unique("aabb")', expected: 'None' },
      { name: 'Empty string', call: 'first_unique("")', expected: 'None' },
    ],
  },
  {
    id: 'python-anagram-groups', topic: 'Strings and dicts', level: 2, title: 'Group the anagrams', minutes: 12,
    prompt: 'Write anagram_groups(words) that groups words made of the same letters. Return a list of groups. Sort the words inside each group, and sort the groups by their first word.\n\nExample: anagram_groups(["tea", "eat", "tan", "ate", "nat"]) returns [["ate", "eat", "tea"], ["nat", "tan"]].',
    starter: 'def anagram_groups(words):\n    pass\n',
    hint: 'Words that are anagrams have the same letters when sorted. Use the sorted letters as a dict key.',
    solution: 'def anagram_groups(words):\n    groups = {}\n    for w in words:\n        key = "".join(sorted(w))\n        groups.setdefault(key, []).append(w)\n    return sorted(sorted(g) for g in groups.values())\n',
    tests: [
      { name: 'Classic example', call: 'anagram_groups(["tea", "eat", "tan", "ate", "nat"])', expected: '[["ate", "eat", "tea"], ["nat", "tan"]]' },
      { name: 'No anagrams', call: 'anagram_groups(["b", "a"])', expected: '[["a"], ["b"]]' },
      { name: 'Empty list', call: 'anagram_groups([])', expected: '[]' },
    ],
  },
  {
    id: 'python-group-by-dept', topic: 'Lists and loops', level: 2, title: 'Total pay by department', minutes: 10,
    prompt: 'Write total_by_dept(rows). Each row is a dict with "dept" and "pay". Return a dict of the total pay for each department.\n\nExample: total_by_dept([{"dept": "a", "pay": 5}, {"dept": "a", "pay": 7}]) returns {"a": 12}.',
    starter: 'def total_by_dept(rows):\n    pass\n',
    hint: 'Loop over the rows. totals[dept] = totals.get(dept, 0) + pay.',
    solution: 'def total_by_dept(rows):\n    totals = {}\n    for r in rows:\n        totals[r["dept"]] = totals.get(r["dept"], 0) + r["pay"]\n    return totals\n',
    tests: [
      { name: 'One department', call: 'total_by_dept([{"dept": "a", "pay": 5}, {"dept": "a", "pay": 7}])', expected: '{"a": 12}' },
      { name: 'Two departments', call: 'total_by_dept([{"dept": "a", "pay": 5}, {"dept": "b", "pay": 2}, {"dept": "a", "pay": 1}])', expected: '{"a": 6, "b": 2}' },
      { name: 'No rows', call: 'total_by_dept([])', expected: '{}' },
    ],
  },
  {
    id: 'python-clean-records', topic: 'Data cleaning', level: 2, title: 'Clean messy customer records', minutes: 14,
    prompt: 'Write clean_records(records). Each record is a dict with "name" and "age". Strip and Title Case the name, turn age into an int, and skip a record if the name is blank or the age is missing or not a number.\n\nExample: clean_records([{"name": " ann ", "age": " 31 "}, {"name": "bob", "age": "n/a"}]) returns [{"name": "Ann", "age": 31}].',
    starter: 'def clean_records(records):\n    pass\n',
    hint: 'Wrap int(...) in try/except (ValueError, TypeError). A None age raises TypeError, "n/a" raises ValueError.',
    solution: 'def clean_records(records):\n    out = []\n    for r in records:\n        name = (r.get("name") or "").strip().title()\n        try:\n            age = int(r.get("age"))\n        except (ValueError, TypeError):\n            continue\n        if name:\n            out.append({"name": name, "age": age})\n    return out\n',
    tests: [
      { name: 'Spaces and bad age', call: 'clean_records([{"name": " ann ", "age": " 31 "}, {"name": "bob", "age": "n/a"}])', expected: '[{"name": "Ann", "age": 31}]' },
      { name: 'Missing values', call: 'clean_records([{"name": None, "age": 5}, {"name": "cy", "age": None}])', expected: '[]' },
      { name: 'Already clean', call: 'clean_records([{"name": "Di", "age": 40}])', expected: '[{"name": "Di", "age": 40}]' },
    ],
  },
  {
    id: 'python-two-sum', topic: 'Algorithms', level: 2, title: 'Two numbers that add up', minutes: 12,
    prompt: 'Write two_sum(nums, target) that returns the positions [i, j] (i < j) of two numbers that add up to target. There is always exactly one answer.\n\nExample: two_sum([2, 7, 11, 15], 9) returns [0, 1].',
    starter: 'def two_sum(nums, target):\n    pass\n',
    hint: 'Keep a dict of value to position for numbers you have passed. For each number, check whether target minus it is already in the dict.',
    solution: 'def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n',
    tests: [
      { name: 'Classic example', call: 'two_sum([2, 7, 11, 15], 9)', expected: '[0, 1]' },
      { name: 'Not at the start', call: 'two_sum([3, 2, 4], 6)', expected: '[1, 2]' },
      { name: 'Same value twice', call: 'two_sum([3, 3], 6)', expected: '[0, 1]' },
    ],
  },
  {
    id: 'python-merge-intervals', topic: 'Algorithms', level: 3, title: 'Merge overlapping intervals', minutes: 15,
    prompt: 'Write merge_intervals(intervals) for a list of [start, end] pairs in any order. Merge any that overlap or touch, and return them sorted by start.\n\nExample: merge_intervals([[8, 10], [1, 3], [2, 6]]) returns [[1, 6], [8, 10]].',
    starter: 'def merge_intervals(intervals):\n    pass\n',
    hint: 'Sort by start. Then for each interval, either extend the last merged one (if it starts at or before its end) or add it as new.',
    solution: 'def merge_intervals(intervals):\n    out = []\n    for start, end in sorted(intervals):\n        if out and start <= out[-1][1]:\n            out[-1][1] = max(out[-1][1], end)\n        else:\n            out.append([start, end])\n    return out\n',
    tests: [
      { name: 'Classic example', call: 'merge_intervals([[8, 10], [1, 3], [2, 6]])', expected: '[[1, 6], [8, 10]]' },
      { name: 'Touching ends', call: 'merge_intervals([[1, 4], [4, 5]])', expected: '[[1, 5]]' },
      { name: 'One inside another', call: 'merge_intervals([[1, 10], [2, 3]])', expected: '[[1, 10]]' },
      { name: 'Empty list', call: 'merge_intervals([])', expected: '[]' },
    ],
  },
  {
    id: 'python-parse-logs', topic: 'Strings and dicts', level: 3, title: 'Count log levels', minutes: 14,
    prompt: 'Each log line looks like "2024-05-01 12:00:03 ERROR payments timeout": date, time, level, then a message. Write level_counts(lines) that returns a dict of how many lines have each level. Skip blank lines and lines with fewer than 3 parts.\n\nExample: level_counts(["2024-05-01 12:00:03 ERROR db down", "2024-05-01 12:00:04 INFO ok"]) returns {"ERROR": 1, "INFO": 1}.',
    starter: 'def level_counts(lines):\n    pass\n',
    hint: 'line.split() gives the parts. The level is parts[2]. Check len(parts) >= 3 first.',
    solution: 'def level_counts(lines):\n    counts = {}\n    for line in lines:\n        parts = line.split()\n        if len(parts) < 3:\n            continue\n        counts[parts[2]] = counts.get(parts[2], 0) + 1\n    return counts\n',
    tests: [
      { name: 'Two levels', call: 'level_counts(["2024-05-01 12:00:03 ERROR db down", "2024-05-01 12:00:04 INFO ok"])', expected: '{"ERROR": 1, "INFO": 1}' },
      { name: 'Blank and short lines', call: 'level_counts(["", "oops", "2024-05-01 12:00:05 WARN slow", "2024-05-01 12:00:06 WARN slower"])', expected: '{"WARN": 2}' },
      { name: 'No lines', call: 'level_counts([])', expected: '{}' },
    ],
  },
  {
    id: 'python-top-k', topic: 'Lists and loops', level: 3, title: 'Top k most common words', minutes: 15,
    prompt: 'Write top_k(words, k) that returns the k most common words as a list. If two words are tied, put the one that comes first alphabetically first. If there are fewer than k different words, return them all.\n\nExample: top_k(["b", "a", "b", "c", "a", "b"], 2) returns ["b", "a"].',
    starter: 'def top_k(words, k):\n    pass\n',
    hint: 'Count first. Then sort the words with a key of (-count, word) and take the first k.',
    solution: 'def top_k(words, k):\n    counts = {}\n    for w in words:\n        counts[w] = counts.get(w, 0) + 1\n    return sorted(counts, key=lambda w: (-counts[w], w))[:k]\n',
    tests: [
      { name: 'Classic example', call: 'top_k(["b", "a", "b", "c", "a", "b"], 2)', expected: '["b", "a"]' },
      { name: 'Ties go alphabetical', call: 'top_k(["z", "y", "x"], 2)', expected: '["x", "y"]' },
      { name: 'k bigger than words', call: 'top_k(["a", "a"], 5)', expected: '["a"]' },
    ],
  },
]
