// @desc    Get Sri Lanka demand map data
// @route   GET /api/demand-map
const getDemandMap = async (req, res) => {
    try {
        const { spice } = req.query;
        // Mock regional data array
        const data = {
            Cinnamon: { Colombo: "VERY_HIGH", Kandy: "HIGH", Matale: "MEDIUM", Galle: "HIGH", Dambulla: "LOW", Kurunegala: "MEDIUM", Anuradhapura: "LOW" },
            Pepper: { Colombo: "HIGH", Kandy: "VERY_HIGH", Matale: "HIGH", Galle: "MEDIUM", Dambulla: "MEDIUM", Kurunegala: "LOW", Anuradhapura: "LOW" },
            Cardamom: { Colombo: "HIGH", Kandy: "HIGH", Matale: "VERY_HIGH", Galle: "LOW", Dambulla: "LOW", Kurunegala: "MEDIUM", Anuradhapura: "LOW" },
            Clove: { Colombo: "MEDIUM", Kandy: "HIGH", Matale: "HIGH", Galle: "MEDIUM", Dambulla: "VERY_HIGH", Kurunegala: "MEDIUM", Anuradhapura: "LOW" },
            Nutmeg: { Colombo: "HIGH", Kandy: "MEDIUM", Matale: "LOW", Galle: "VERY_HIGH", Dambulla: "LOW", Kurunegala: "HIGH", Anuradhapura: "MEDIUM" },
        };

        const requestedSpice = spice || "Cinnamon";
        const result = data[requestedSpice] || data["Cinnamon"];

        res.json({
            spice: requestedSpice,
            regions: result
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDemandMap
};
