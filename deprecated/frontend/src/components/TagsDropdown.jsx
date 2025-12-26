import { useState, useRef, useEffect } from 'react'
import './TagsDropdown.css'

function TagsDropdown({ availableTags, selectedTags, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  const clearAll = () => {
    onChange([])
    setIsOpen(false)
  }

  const filteredTags = availableTags.filter(tag =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDisplayText = () => {
    if (selectedTags.length === 0) return 'Labels'
    if (selectedTags.length === 1) return selectedTags[0]
    return `${selectedTags.length} selected`
  }

  return (
    <div className="tags-dropdown" ref={dropdownRef}>
      <button
        className="tags-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className={selectedTags.length === 0 ? 'placeholder' : ''}>
          {getDisplayText()}
        </span>
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="tags-dropdown-menu">
          <div className="tags-dropdown-search">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="tags-dropdown-list">
            {filteredTags.length === 0 ? (
              <div className="no-results">No tags found</div>
            ) : (
              filteredTags.map(tag => (
                <label key={tag} className="tags-dropdown-item">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="tag-label">{tag}</span>
                </label>
              ))
            )}
          </div>

          {selectedTags.length > 0 && (
            <div className="tags-dropdown-footer">
              <button
                className="clear-all-btn"
                onClick={clearAll}
                type="button"
              >
                Clear all ({selectedTags.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TagsDropdown
