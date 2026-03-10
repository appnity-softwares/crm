export const uploadToCloudinary = async (file) => {
    const cloudName = "dnx7h7b7z"; // Mock Cloud Name - User should replace
    const uploadPreset = "erp_unsigned"; // Mock Preset - User should replace

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        throw new Error("Cloudinary upload failed");
    }
};
