
import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabase'

function App() {
  const [grade, setGrade] = useState(10)
  const [page, setPage] = useState('Home')

  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedTest, setSelectedTest] = useState(null)

  const [subjects, setSubjects] = useState([])
  const [tests, setTests] = useState([])
  const [questions, setQuestions] = useState([])

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [finished, setFinished] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [resultSaving, setResultSaving] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)

  const [leaderboard, setLeaderboard] = useState([])

  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingTests, setLoadingTests] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [loadingRanking, setLoadingRanking] = useState(false)

  const [error, setError] = useState('')

  // LOAD SUBJECTS
  useEffect(() => {
    async function loadSubjects() {
      setLoadingSubjects(true)

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('id')

      if (error) {
        setError(error.message)
      } else {
        setSubjects(data || [])
      }

      setLoadingSubjects(false)
    }

    loadSubjects()
  }, [])

  // LOAD TESTS
  useEffect(() => {
    if (!selectedSubject) return

    let cancelled = false

    async function loadTests() {
      setLoadingTests(true)
      setError('')
      setTests([])

      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('id')
        .eq('grade_number', grade)
        .single()

      if (gradeError) {
        if (!cancelled) {
          setError(gradeError.message)
          setLoadingTests(false)
        }
        return
      }

      const { data, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('grade_id', gradeData.id)
        .eq('subject_id', selectedSubject.id)
        .order('id')

      if (cancelled) return

      if (testError) {
        setError(testError.message)
      } else {
        setTests(data || [])
      }

      setLoadingTests(false)
    }

    loadTests()

    return () => {
      cancelled = true
    }
  }, [grade, selectedSubject])

  // OPEN SUBJECT
  function openSubject(subject) {
    setSelectedSubject(subject)
    setSelectedTest(null)
    setPage('Tests')
    setError('')
  }

  // BACK TO SUBJECTS
  function goBack() {
    setSelectedSubject(null)
    setSelectedTest(null)
    setTests([])
    setQuestions([])
    setError('')
    setPage('Subjects')
  }

  // START TEST
  async function startTest(test) {
    setSelectedTest(test)
    setLoadingQuestions(true)
    setQuestions([])
    setAnswers({})
    setCurrentQuestion(0)
    setFinished(false)
    setResultSaved(false)
    setDisplayName('')
    setError('')
    setPage('Quiz')

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', test.id)
      .order('id')

    if (error) {
      setError(error.message)
    } else {
      setQuestions(data || [])
    }

    setLoadingQuestions(false)
  }

  // CHOOSE ANSWER
  function chooseAnswer(answer) {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestion].id]: answer
    }))
  }

  // NEXT QUESTION
  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      setFinished(true)
    }
  }

  // CALCULATE SCORE
  function calculateScore() {
    return questions.filter(question =>
      answers[question.id] === question.correct_answer
    ).length
  }

  // SAVE RESULT
  async function saveResult() {
    if (!displayName.trim()) {
      setError('Please enter your nickname.')
      return
    }

    if (resultSaved || resultSaving || !selectedTest) return

    setResultSaving(true)
    setError('')

    const { error } = await supabase
      .from('results')
      .insert({
        test_id: selectedTest.id,
        score: calculateScore(),
        total_questions: questions.length,
        display_name: displayName.trim()
      })

    if (error) {
      setError(error.message)
    } else {
      setResultSaved(true)
    }

    setResultSaving(false)
  }

  // LOAD RANKING AND RESULTS
  async function loadRanking() {
    setLoadingRanking(true)
    setError('')

    const { data, error } = await supabase
      .from('results')
      .select('display_name, score, total_questions, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLeaderboard([])
    } else {
      const sorted = (data || []).sort((a, b) => {
        const aPercent = a.total_questions
          ? a.score / a.total_questions
          : 0

        const bPercent = b.total_questions
          ? b.score / b.total_questions
          : 0

        return bPercent - aPercent
      })

      setLeaderboard(sorted)
    }

    setLoadingRanking(false)
  }

  // BACK TO TESTS
  function backToTests() {
    setSelectedTest(null)
    setQuestions([])
    setAnswers({})
    setFinished(false)
    setResultSaved(false)
    setError('')
    setPage('Tests')
  }

  // NAVIGATION
  function navigate(item) {
    setPage(item)
    setSelectedSubject(null)
    setSelectedTest(null)
    setError('')

    if (item === 'Ranking' || item === 'Results') {
      loadRanking()
    }
  }

  const question = questions[currentQuestion]

  const showHomeContent = ['Home', 'Grades', 'Subjects'].includes(page)

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <h2 className="logo">
          ISAKOV<span> TESTS</span>
        </h2>

        <p className="menu-title">MENU</p>

        {['Home', 'Grades', 'Subjects', 'Results', 'Ranking', 'Profile'].map(item => (
          <button
            key={item}
            className={page === item ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate(item)}
          >
            {item}
          </button>
        ))}

        <div className="sidebar-bottom">
          <p>YOUR FUTURE STARTS HERE</p>
          <strong>Learn. Practice. Succeed.</strong>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">

        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <p className="muted">WELCOME TO ISAKOV TESTS</p>

            <h1>
              {page === 'Quiz'
                ? selectedTest?.title
                : selectedSubject && page === 'Tests'
                  ? selectedSubject.name + ' Tests'
                  : page === 'Home'
                    ? 'Dashboard'
                    : page}
            </h1>
          </div>

          <div className="avatar">S</div>
        </header>

        {/* HOME / GRADES / SUBJECTS */}
        {showHomeContent && !selectedSubject && (
          <>
            {(page === 'Home' || page === 'Grades') && (
              <>
                <section className="hero">
                  <div>
                    <span className="tag">YOUR LEARNING JOURNEY</span>

                    <h2>Unlock Your<br />Potential.</h2>

                    <p>
                      Learn smarter, practice harder and achieve your goals.
                    </p>

                    <button
                      className="primary-btn"
                      onClick={() => setPage('Subjects')}
                    >
                      Start Learning →
                    </button>
                  </div>

                  <div className="hero-icon">🎓</div>
                </section>

                <section className="stats">
                  <div className="stat-card">
                    <span>📚</span>
                    <p>Available subjects</p>
                    <h2>{subjects.length.toString().padStart(2, '0')}</h2>
                  </div>

                  <div className="stat-card">
                    <span>📝</span>
                    <p>Available tests</p>
                    <h2>560</h2>
                  </div>

                  <div className="stat-card">
                    <span>🎯</span>
                    <p>Questions</p>
                    <h2>11,200</h2>
                  </div>
                </section>

                <section className="content-section">
                  <div className="section-heading">
                    <div>
                      <p className="muted">CHOOSE YOUR LEVEL</p>
                      <h2>Select your grade</h2>
                    </div>

                    <span className="muted">Grades 5–11</span>
                  </div>

                  <div className="grades">
                    {[5, 6, 7, 8, 9, 10, 11].map(g => (
                      <button
                        key={g}
                        className={grade === g ? 'grade active-grade' : 'grade'}
                        onClick={() => setGrade(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="muted">GRADE {grade}</p>
                  <h2>Explore subjects</h2>
                </div>

                <span className="muted">{subjects.length} subjects</span>
              </div>

              {loadingSubjects && <p>Loading subjects...</p>}

              {!loadingSubjects && error && (
                <p style={{ color: '#ff7070' }}>{error}</p>
              )}

              {!loadingSubjects && !error && (
                <div className="subjects">
                  {subjects.map(subject => (
                    <div className="subject-card" key={subject.id}>
                      <span className="subject-icon">
                        {subject.icon || '📚'}
                      </span>

                      <h3>{subject.name}</h3>
                      <p>10 tests available</p>

                      <button onClick={() => openSubject(subject)}>
                        View tests →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* TEST LIST */}
        {selectedSubject && page === 'Tests' && (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="muted">
                  GRADE {grade} / {selectedSubject.name.toUpperCase()}
                </p>

                <h2>Choose your test</h2>
              </div>

              <button className="primary-btn" onClick={goBack}>
                ← Back to subjects
              </button>
            </div>

            {loadingTests && <p>Loading tests...</p>}

            {error && (
              <p style={{ color: '#ff7070' }}>
                Supabase error: {error}
              </p>
            )}

            {!loadingTests && !error && tests.length === 0 && (
              <p>No tests found.</p>
            )}

            {!loadingTests && !error && tests.length > 0 && (
              <div className="subjects">
                {tests.map(test => (
                  <div className="subject-card" key={test.id}>
                    <span className="subject-icon">📝</span>
                    <h3>{test.title}</h3>
                    <p>{test.question_count} questions</p>
                    <p>Grade {grade}</p>

                    <button onClick={() => startTest(test)}>
                      Start test →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* QUIZ */}
        {page === 'Quiz' && (
          <section className="content-section">

            <button className="primary-btn" onClick={backToTests}>
              ← Back to tests
            </button>

            {loadingQuestions && <p>Loading questions...</p>}

            {error && (
              <p style={{ color: '#ff7070' }}>{error}</p>
            )}

            {!loadingQuestions && !error && questions.length === 0 && (
              <p>Bu testda hali savollar mavjud emas.</p>
            )}

            {!loadingQuestions && !error && questions.length > 0 && (
              <>
                {finished ? (
                  <div className="subject-card result-card">
                    <span className="subject-icon">🏆</span>

                    <h2>Test completed!</h2>

                    <h1>
                      {calculateScore()} / {questions.length}
                    </h1>

                    <p>
                      Your result: {Math.round(
                        calculateScore() / questions.length * 100
                      )}%
                    </p>

                    <input
                      type="text"
                      placeholder="Enter your nickname"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      maxLength={20}
                    />

                    <button
                      onClick={saveResult}
                      disabled={resultSaving || resultSaved || !displayName.trim()}
                    >
                      {resultSaving
                        ? 'Saving...'
                        : resultSaved
                          ? 'Saved ✓'
                          : 'Save result'}
                    </button>

                    {error && (
                      <p style={{ color: '#ff7070' }}>{error}</p>
                    )}

                    <button onClick={backToTests}>
                      Back to tests →
                    </button>
                  </div>
                ) : (
                  <div className="subject-card quiz-card">
                    <p className="muted">
                      QUESTION {currentQuestion + 1} OF {questions.length}
                    </p>

                    <div className="quiz-progress">
                      <div
                        style={{
                          width: `${((currentQuestion + 1) / questions.length) * 100}%`
                        }}
                      />
                    </div>

                    <h2>{question.question_text}</h2>

                    <div className="quiz-options">
                      {(
                        Array.isArray(question.options)
                          ? question.options
                          : JSON.parse(question.options)
                      ).map((option, index) => (
                        <button
                          key={index}
                          className={
                            answers[question.id] === option
                              ? 'quiz-option selected-option'
                              : 'quiz-option'
                          }
                          onClick={() => chooseAnswer(option)}
                        >
                          <span>{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </button>
                      ))}
                    </div>

                    <button
                      className="primary-btn next-btn"
                      disabled={!answers[question.id]}
                      onClick={nextQuestion}
                    >
                      {currentQuestion === questions.length - 1
                        ? 'Finish test'
                        : 'Next question →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* RANKING AND RESULTS */}
        {(page === 'Ranking' || page === 'Results') && (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="muted">ISAKOV TESTS</p>

                <h2>
                  {page === 'Ranking'
                    ? '🏆 Leaderboard'
                    : '📊 Test Results'}
                </h2>
              </div>

              <button className="primary-btn" onClick={loadRanking}>
                Refresh
              </button>
            </div>

            {loadingRanking && <p>Loading results...</p>}

            {!loadingRanking && error && (
              <p style={{ color: '#ff7070' }}>{error}</p>
            )}

            {!loadingRanking && !error && leaderboard.length === 0 && (
              <p>No results yet. Complete your first test!</p>
            )}

            {!loadingRanking && !error && leaderboard.map((item, index) => (
              <div
                className="subject-card"
                key={`${item.created_at}-${index}`}
              >
                <h3>
                  {page === 'Ranking' ? `#${index + 1} ` : ''}
                  {item.display_name || 'Student'}
                </h3>

                <p>
                  Score: {item.score}/{item.total_questions}
                </p>

                <p>
                  {Math.round(
                    item.score / item.total_questions * 100
                  )}%
                </p>
              </div>
            ))}
          </section>
        )}

        {/* PROFILE */}
        {page === 'Profile' && (
          <section className="content-section">
            <div className="subject-card">
              <span className="subject-icon">👤</span>
              <h2>Student Profile</h2>
              <p>Account login will be added in a future update.</p>
            </div>
          </section>
        )}

        <footer>
          © 2026 ISAKOV TESTS. All rights reserved.
        </footer>

      </main>
    </div>
  )
}

export default App
