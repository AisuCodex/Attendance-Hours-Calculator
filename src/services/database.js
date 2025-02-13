const API_URL = 'http://localhost:3000/api';

export async function saveRecord(record) {
  console.log('Saving record:', record);
  try {
    const response = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save record');
    }

    const result = await response.json();
    console.log('Record saved successfully:', result);
    return result.id;
  } catch (error) {
    console.error('Error saving record:', error);
    throw error;
  }
}

export async function updateRecord(record) {
  console.log('Updating record:', record);
  try {
    const response = await fetch(`${API_URL}/records/${record.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update record');
    }

    const result = await response.json();
    console.log('Record updated successfully:', result);
    return result.changes;
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
}

export async function getAllRecords() {
  console.log('Fetching all records');
  try {
    const response = await fetch(`${API_URL}/records`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch records');
    }

    const records = await response.json();
    console.log(`Retrieved ${records.length} records`);
    return records;
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
}

export async function deleteRecord(id) {
  console.log('Deleting record:', id);
  try {
    const response = await fetch(`${API_URL}/records/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete record');
    }

    const result = await response.json();
    console.log('Record deleted successfully:', result);
    return result.changes;
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
}
