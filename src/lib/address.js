// Ship address ke aakhri 6 ankon se pincode nikalna (orderFlow.js aur logistics.js dono yahin se lete hain)
export const pincodeOf = (o) => (String(o.ship_address || "").match(/(\d{6})\s*$/) || [])[1] || "";
