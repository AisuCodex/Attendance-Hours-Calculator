import { useState, useEffect } from 'react';
import './App.css';
import sunLifeLogo from './assets/sunlife logo.png';
import {
  Search,
  UserPlus,
  Printer,
  Download,
  Save,
  Trash2,
  Calculator,
  Clock,
  User,
  Calendar,
  Image,
} from 'lucide-react';
import {
  saveRecord,
  updateRecord,
  getAllRecords,
  deleteRecord,
} from './services/database';

function App() {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [saveStatus, setSaveStatus] = useState({
    show: false,
    message: '',
    isError: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    recordId: null,
    studentName: '',
  });
  const [showTotalHours, setShowTotalHours] = useState(false);
  const [totalHours, setTotalHours] = useState('0.00');

  useEffect(() => {
    loadRecords();
  }, [sortOrder]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const loadedRecords = await getAllRecords(sortOrder);
      setRecords(loadedRecords || []);
      setError(null);
    } catch (error) {
      console.error('Error loading records:', error);
      setError('Failed to load records. Please try refreshing the page.');
      showSaveStatus('Error loading records', true);
    } finally {
      setIsLoading(false);
    }
  };

  const showSaveStatus = (message, isError = false) => {
    setSaveStatus({ show: true, message, isError });
    setTimeout(
      () => setSaveStatus({ show: false, message: '', isError: false }),
      3000
    );
  };

  const addRow = async () => {
    const newRecord = {
      studentName: '',
      role: '',
      date: '',
      timeIn: '',
      timeOut: '',
      totalHours: '',
      imageUrl: null,
    };

    try {
      // Save the record immediately
      const result = await saveRecord(newRecord);
      const savedRecord = {
        ...newRecord,
        id: result.id,
        createdAt: result.createdAt,
      };
      setRecords((prevRecords) => [savedRecord, ...prevRecords]);
      showSaveStatus('New row added successfully');
    } catch (error) {
      console.error('Error adding new row:', error);
      showSaveStatus('Error adding new row', true);
    }
  };

  const deleteRow = async (id) => {
    try {
      await deleteRecord(id);
      setRecords(records.filter((record) => record.id !== id));
      showSaveStatus('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      showSaveStatus('Error deleting record', true);
    }
  };

  const calculateHours = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;

    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);

    // Convert to minutes since midnight
    const inTime = inHours * 60 + inMinutes;
    const outTime = outHours * 60 + outMinutes;

    // Handle cases where someone works past midnight
    const totalMinutes =
      outTime < inTime
        ? 24 * 60 - inTime + outTime // Worked past midnight
        : outTime - inTime;

    // Subtract 1 hour (60 minutes) for lunch time and convert to hours
    const totalHoursAfterLunch = Math.max(0, (totalMinutes - 60) / 60);
    return totalHoursAfterLunch.toFixed(2);
  };

  const handleRecordUpdate = async (id, field, value) => {
    setRecords((prevRecords) =>
      prevRecords.map((record) => {
        if (record.id === id) {
          const updatedRecord = { ...record, [field]: value };
          if (field === 'timeIn' || field === 'timeOut') {
            const timeIn = field === 'timeIn' ? value : record.timeIn;
            const timeOut = field === 'timeOut' ? value : record.timeOut;
            updatedRecord.totalHours = calculateHours(timeIn, timeOut);
          }

          // Auto-save the changes
          saveRecordHandler(updatedRecord).catch((error) => {
            console.error('Error auto-saving record:', error);
            showSaveStatus('Error saving changes', true);
          });

          return updatedRecord;
        }
        return record;
      })
    );
  };

  const saveRecordHandler = async (record) => {
    try {
      console.log('Saving record:', record);
      let savedRecord;

      // Update existing record
      await updateRecord(record);
      savedRecord = record;
      showSaveStatus('Changes saved successfully');

      // Update the records state with the saved record
      setRecords((prevRecords) =>
        prevRecords.map((r) => (r.id === record.id ? savedRecord : r))
      );
    } catch (error) {
      console.error('Error saving record:', error);
      showSaveStatus(`Error saving record: ${error.message}`, true);
      throw error; // Re-throw the error so we can handle it in handleRecordUpdate
    }
  };

  const calculateTotalHours = () => {
    const total = filteredRecords
      .reduce(
        (total, record) => total + (parseFloat(record.totalHours) || 0),
        0
      )
      .toFixed(2);
    setTotalHours(total);
    setShowTotalHours(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadCSV = () => {
    const headers = [
      'Student Name',
      'Role',
      'Date',
      'Time In',
      'Time Out',
      'Total Hours',
      'Image',
    ];
    const csvContent = [
      headers.join(','),
      ...records.map((record) =>
        [
          record.studentName,
          record.role,
          record.date,
          record.timeIn,
          record.timeOut,
          record.totalHours,
          record.imageUrl ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSignatureUpload = (id, event) => {
    const file = event.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes

    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      showSaveStatus('Please upload an image file', true);
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      showSaveStatus('Image size should be less than 10MB', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      handleRecordUpdate(id, 'imageUrl', e.target.result);
    };
    reader.onerror = () => {
      showSaveStatus('Error reading image file', true);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteClick = (record) => {
    setDeleteModal({
      show: true,
      recordId: record.id,
      studentName: record.studentName,
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteRecord(deleteModal.recordId);
      setRecords(
        records.filter((record) => record.id !== deleteModal.recordId)
      );
      showSaveStatus('Record deleted successfully');
      setDeleteModal({ show: false, recordId: null, studentName: '' });
    } catch (error) {
      console.error('Error deleting record:', error);
      showSaveStatus('Error deleting record', true);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, recordId: null, studentName: '' });
  };

  const filteredRecords = records.filter((record) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = record.studentName
      .toLowerCase()
      .includes(searchTermLower);
    const roleMatch = record.role.toLowerCase().includes(searchTermLower);
    const dateMatch = !searchDate || record.date.includes(searchDate);
    return (nameMatch || roleMatch) && dateMatch;
  });

  return (
    <div className="container">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={loadRecords}>Try Again</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading records...</div>
      ) : (
        <>
          {saveStatus.show && (
            <div
              className={`save-status ${
                saveStatus.isError ? 'error' : 'success'
              }`}
            >
              {saveStatus.message}
            </div>
          )}

          <header>
            <h1>WEEKLY ATTENDANCE</h1>
            <img src={sunLifeLogo} alt="Sun Life Financial" className="logo" />
          </header>

          <div className="controls">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="sort-select"
              >
                <option value="desc">Newest Created First</option>
                <option value="asc">Oldest Created First</option>
              </select>
              <button className="search-btn">
                <Search size={18} /> Search
              </button>
            </div>
            <div className="action-buttons">
              <button className="add-btn" onClick={addRow}>
                <UserPlus size={18} /> Add Row
              </button>
              <button className="print-btn" onClick={handlePrint}>
                <Printer size={18} /> Print
              </button>
              <button className="download-btn" onClick={downloadCSV}>
                <Download size={18} /> Download CSV
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <User size={16} />
                    Student Name
                  </th>
                  <th>
                    <User size={16} />
                    Role
                  </th>
                  <th>
                    <Calendar size={16} />
                    Date
                  </th>
                  <th>
                    <Clock size={16} />
                    Time In
                  </th>
                  <th>
                    <Clock size={16} />
                    Time Out
                  </th>
                  <th>
                    <Calculator size={16} />
                    Hours
                  </th>
                  <th>
                    <Image size={16} />
                    Signature
                  </th>
                  <th>
                    <Save size={16} />
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="record-row">
                    <td data-label="Student Name">
                      <input
                        type="text"
                        placeholder="Enter name..."
                        value={record.studentName}
                        onChange={(e) =>
                          handleRecordUpdate(
                            record.id,
                            'studentName',
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td data-label="Role">
                      <select
                        value={record.role}
                        onChange={(e) =>
                          handleRecordUpdate(record.id, 'role', e.target.value)
                        }
                      >
                        <option value="">Select Role</option>
                        <option value="Intern">Web Developer</option>
                        <option value="Student">UI/UX</option>
                        <option value="Teacher">QA</option>
                        {/* <option value="Admin">Admin</option> */}
                      </select>
                    </td>
                    <td data-label="Date">
                      <input
                        type="date"
                        value={record.date}
                        onChange={(e) =>
                          handleRecordUpdate(record.id, 'date', e.target.value)
                        }
                      />
                    </td>
                    <td data-label="Time In">
                      <input
                        type="time"
                        value={record.timeIn}
                        onChange={(e) =>
                          handleRecordUpdate(
                            record.id,
                            'timeIn',
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td data-label="Time Out">
                      <input
                        type="time"
                        value={record.timeOut}
                        onChange={(e) =>
                          handleRecordUpdate(
                            record.id,
                            'timeOut',
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td data-label="Hours" className="hours-cell">
                      {record.totalHours ? `${record.totalHours} hrs` : '-'}
                    </td>
                    <td data-label="Signature" className="signature-cell">
                      {record.imageUrl ? (
                        <div className="signature-preview">
                          <img
                            src={record.imageUrl}
                            alt="Signature"
                            className="signature-image"
                          />
                          <button
                            className="remove-signature"
                            onClick={() =>
                              handleRecordUpdate(record.id, 'imageUrl', null)
                            }
                            title="Remove Signature"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="signature-upload">
                          <label
                            className="signature-placeholder"
                            htmlFor={`signature-${record.id}`}
                          >
                            <Image size={20} />
                            <span>Click to add signature</span>
                          </label>
                          <input
                            id={`signature-${record.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleSignatureUpload(record.id, e)
                            }
                            className="signature-input"
                          />
                        </div>
                      )}
                    </td>
                    <td data-label="Actions">
                      <button
                        className="save-btn"
                        title="Save"
                        onClick={() => saveRecordHandler(record)}
                      >
                        <Save size={16} />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteClick(record)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="footer">
            <button className="calculate-btn" onClick={calculateTotalHours}>
              <Calculator size={18} /> Calculate Total Hours
            </button>
            <div className="total-hours">
              {showTotalHours ? `Total Hours Worked: ${totalHours} hrs` : ''}
            </div>
          </div>
        </>
      )}

      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              Are you sure you want to delete the record for{' '}
              <strong>{deleteModal.studentName || 'this student'}</strong>? This
              action cannot be undone.
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button
                className="modal-delete-btn"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
