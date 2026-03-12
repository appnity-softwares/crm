export const exportToCSV = (data, filename, headers) => {
    if (!data || !data.length) return;

    const csvRows = [];
    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = header.split('.').reduce((obj, key) => (obj && obj[key]) || '', row);
            const escaped = ('' + val).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
