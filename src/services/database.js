const API_URL = '/api';

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

export async function getAllRecords(sortOrder = 'desc') {
  console.log('Fetching all records');
  try {
    const response = await fetch(`${API_URL}/records?sort=${sortOrder}`);

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
  try {
    // Don't attempt to delete if no ID is provided
    if (!id) {
      throw new Error('No record ID provided');
    }

    const response = await fetch(`${API_URL}/records/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || `Failed to delete record (Status: ${response.status})`
      );
    }

    return true; // Successfully deleted
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
}
